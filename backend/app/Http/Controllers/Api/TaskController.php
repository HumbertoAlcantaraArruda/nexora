<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BoardColumn;
use App\Models\Task;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
     * Exclui uma tarefa.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $task = $this->findUserTask($request, $id)
            ->firstOrFail();

        $task->delete();

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
