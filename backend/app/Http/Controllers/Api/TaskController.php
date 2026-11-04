<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthorizesBoardAccess;
use App\Http\Controllers\Controller;
use App\Models\BoardColumn;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class TaskController extends Controller
{
    use AuthorizesBoardAccess;

    /**
     * Responsável: qualquer usuário da plataforma, ou nulo (sem responsável).
     * Ser responsável não dá acesso ao quadro.
     */
    private const ASSIGNEE_RULES = ['sometimes', 'nullable', 'integer', 'exists:users,id'];

    private const ASSIGNEE_MESSAGES = ['assignee_id.exists' => 'Usuário não encontrado.'];

    /**
     * Lista as tarefas dos quadros que o usuário acessa.
     */
    public function index(Request $request): JsonResponse
    {
        $tasks = Task::query()
            ->whereHas('column.board', function ($query) use ($request) {
                $query->accessibleBy($request->user());
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
     * Cria uma tarefa em uma coluna de um quadro que o usuário pode editar.
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
            'description' => ['nullable', 'string', 'max:5000'],
            'priority' => [
                'sometimes',
                'required',
                'in:low,medium,high',
            ],
            'due_date' => ['nullable', 'date'],
            'position' => ['sometimes', 'integer', 'min:0'],
            'assignee_id' => self::ASSIGNEE_RULES,
        ], self::ASSIGNEE_MESSAGES);

        $column = $this->findAccessibleColumn($request, $validated['board_column_id']);

        $this->ensureCanEdit($column->board, $request->user());

        $task = $column->tasks()->create([
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'priority' => $validated['priority'] ?? 'medium',
            'due_date' => $validated['due_date'] ?? null,
            'position' => $validated['position'] ?? 0,
            'assignee_id' => $validated['assignee_id'] ?? null,
        ]);

        return response()->json([
            'mensagem' => 'ok',
            'tarefa' => $task->load(Task::ASSIGNEE_COLUMNS),
        ], 201);
    }

    /**
     * Consulta uma tarefa específica.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $task = $this->findUserTask($request, $id)
            ->with(['column.board', Task::ASSIGNEE_COLUMNS])
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
            ->with('column.board')
            ->firstOrFail();

        $this->ensureCanEdit($task->column->board, $request->user());

        $validated = $request->validate([
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
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
            'assignee_id' => self::ASSIGNEE_RULES,
        ], self::ASSIGNEE_MESSAGES);

        if (isset($validated['board_column_id'])) {
            $target = $this->findAccessibleColumn($request, $validated['board_column_id']);

            $this->ensureCanEdit($target->board, $request->user());
        }

        $task->update($validated);

        return response()->json([
            'mensagem' => 'ok',
            'tarefa' => $task->refresh()->load(Task::ASSIGNEE_COLUMNS),
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

        $user = $request->user();

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
            $user,
            $validated,
            $columnIds,
            $submittedTaskIds,
        ) {
            // Colunas e tarefas precisam existir para o usuário (senão 404)...
            $accessibleColumns = BoardColumn::query()
                ->whereHas('board', fn ($query) => $query->accessibleBy($user))
                ->whereIn('id', $columnIds)
                ->count();

            if ($accessibleColumns !== count($columnIds)) {
                throw new ModelNotFoundException();
            }

            $userTasks = Task::query()
                ->whereHas('column.board', fn ($query) => $query->accessibleBy($user))
                ->whereIn('id', $submittedTaskIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($userTasks->count() !== count($submittedTaskIds)) {
                throw new ModelNotFoundException();
            }

            // ...e estar em quadros que ele pode editar (senão 403).
            $editableColumns = BoardColumn::query()
                ->whereHas('board', fn ($query) => $query->editableBy($user))
                ->whereIn('id', $columnIds)
                ->count();

            $editableTasks = Task::query()
                ->whereHas('column.board', fn ($query) => $query->editableBy($user))
                ->whereIn('id', $submittedTaskIds)
                ->count();

            if ($editableColumns !== count($columnIds) || $editableTasks !== count($submittedTaskIds)) {
                throw new HttpException(403, 'Você tem acesso somente para visualizar este quadro.');
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
            ->with('column.board')
            ->firstOrFail();

        $this->ensureCanEdit($task->column->board, $request->user());

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
     * Busca tarefas somente nos quadros que o usuário acessa (próprios ou
     * compartilhados). A permissão de edição é conferida em cada ação.
     */
    private function findUserTask(
        Request $request,
        string $id
    ): Builder {
        return Task::query()
            ->whereHas('column.board', function ($query) use ($request) {
                $query->accessibleBy($request->user());
            })
            ->where('id', $id);
    }

    private function findAccessibleColumn(Request $request, int|string $id): BoardColumn
    {
        return BoardColumn::query()
            ->whereHas('board', function ($query) use ($request) {
                $query->accessibleBy($request->user());
            })
            ->with('board')
            ->findOrFail($id);
    }
}
