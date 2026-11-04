<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BoardColumn;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TaskController extends Controller
{
    /**
     * Lista as tarefas dos quadros do usuário autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $tasks = Task::query()
            ->whereHas('column.board', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })
            ->with('column')
            ->orderBy('position')
            ->get();

        return response()->json([
            'mensagem' => 'ok',
            'tarefas' => $tasks,
        ]);
    }

    /**
     * Cria uma tarefa em uma coluna de um quadro do usuário.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'board_column_id' => [
                'required',
                'integer',
                'exists:board_columns,id',
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'priority' => [
                'sometimes',
                'required',
                'in:low,medium,high',
            ],
            'due_date' => ['nullable', 'date'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ]);

        $column = BoardColumn::query()
            ->whereHas('board', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })
            ->findOrFail($validated['board_column_id']);

        $task = $column->tasks()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'priority' => $validated['priority'] ?? 'medium',
            'due_date' => $validated['due_date'] ?? null,
            'position' => $validated['position'] ?? 0,
        ]);

        return response()->json([
            'mensagem' => 'ok',
            'tarefa' => $task,
        ], 201);
    }

    /**
     * Consulta uma tarefa específica.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $task = $this->findUserTask($request, $id)
            ->with('column.board')
            ->firstOrFail();

        return response()->json([
            'mensagem' => 'ok',
            'tarefa' => $task,
        ]);
    }

    /**
     * Atualiza uma tarefa.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $task = $this->findUserTask($request, $id)
            ->firstOrFail();

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'priority' => [
                'sometimes',
                'required',
                'in:low,medium,high',
            ],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'board_column_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:board_columns,id',
            ],
        ]);

        if (isset($validated['board_column_id'])) {
            BoardColumn::query()
                ->whereHas('board', function ($query) use ($request) {
                    $query->where('user_id', $request->user()->id);
                })
                ->findOrFail($validated['board_column_id']);
        }

        $task->update($validated);

        return response()->json([
            'mensagem' => 'ok',
            'tarefa' => $task->refresh(),
        ]);
    }

    /**
     * Atualiza em lote a ordem das tarefas de uma ou mais colunas.
     *
     * Cada coluna enviada deve listar, na nova ordem, todas as tarefas que
     * ficarão nela. As posições são regravadas sequencialmente a partir de
     * zero dentro de uma transação: ou tudo é salvo, ou nada é alterado.
     */
    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'columns' => ['required', 'array', 'min:1'],
            'columns.*.id' => ['required', 'integer', 'distinct'],
            'columns.*.task_ids' => ['present', 'array'],
            'columns.*.task_ids.*' => ['required', 'integer', 'distinct'],
        ]);

        $columnIds = array_map(
            fn (array $column): int => (int) $column['id'],
            $validated['columns'],
        );

        $submittedTaskIds = array_merge(
            ...array_map(
                fn (array $column): array => array_map('intval', $column['task_ids']),
                $validated['columns'],
            ),
        );

        $tasks = DB::transaction(function () use (
            $request,
            $validated,
            $columnIds,
            $submittedTaskIds,
        ) {
            $userColumnsCount = BoardColumn::query()
                ->whereHas('board', function ($query) use ($request) {
                    $query->where('user_id', $request->user()->id);
                })
                ->whereIn('id', $columnIds)
                ->count();

            if ($userColumnsCount !== count($columnIds)) {
                throw new ModelNotFoundException();
            }

            $userTasks = Task::query()
                ->whereHas('column.board', function ($query) use ($request) {
                    $query->where('user_id', $request->user()->id);
                })
                ->whereIn('id', $submittedTaskIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($userTasks->count() !== count($submittedTaskIds)) {
                throw new ModelNotFoundException();
            }

            // Toda tarefa que hoje está nas colunas enviadas precisa constar na
            // nova ordem; caso contrário ela ficaria com posição inconsistente.
            $currentTaskIds = Task::query()
                ->whereIn('board_column_id', $columnIds)
                ->lockForUpdate()
                ->pluck('id')
                ->all();

            $missing = array_diff($currentTaskIds, $submittedTaskIds);

            if ($missing !== []) {
                throw ValidationException::withMessages([
                    'columns' => 'Todas as tarefas das colunas enviadas devem ser informadas.',
                ]);
            }

            foreach ($validated['columns'] as $column) {
                foreach (array_values($column['task_ids']) as $position => $taskId) {
                    $task = $userTasks->get((int) $taskId);

                    $task->fill([
                        'board_column_id' => (int) $column['id'],
                        'position' => $position,
                    ]);

                    if ($task->isDirty()) {
                        $task->save();
                    }
                }
            }

            return Task::query()
                ->whereIn('board_column_id', $columnIds)
                ->orderBy('board_column_id')
                ->orderBy('position')
                ->get();
        });

        return response()->json([
            'mensagem' => 'ok',
            'tarefas' => $tasks,
        ]);
    }

    /**
     * Exclui uma tarefa e reorganiza as posições restantes da coluna.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $task = $this->findUserTask($request, $id)
            ->firstOrFail();

        DB::transaction(function () use ($task) {
            $task->delete();

            Task::query()
                ->where('board_column_id', $task->board_column_id)
                ->where('position', '>', $task->position)
                ->decrement('position');
        });

        return response()->json([
            'mensagem' => 'ok',
        ]);
    }

    /**
     * Busca tarefas somente nos quadros do usuário autenticado.
     */
    private function findUserTask(
        Request $request,
        string $id
    ): Builder {
        return Task::query()
            ->whereHas('column.board', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })
            ->where('id', $id);
    }
}
