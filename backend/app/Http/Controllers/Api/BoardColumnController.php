<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BoardColumn;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardColumnController extends Controller
{
    /**
     * Lista as colunas dos quadros do usuário autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $columns = BoardColumn::query()
            ->whereHas('board', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })
            ->with('tasks')
            ->orderBy('position')
            ->get();

        return response()->json([
            'mensagem' => 'ok',
            'colunas' => $columns,
        ]);
    }

    /**
     * Cria uma coluna em um quadro do usuário autenticado.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'board_id' => ['required', 'integer', 'exists:boards,id'],
            'name' => ['required', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ]);

        $board = $request->user()
            ->boards()
            ->findOrFail($validated['board_id']);

        $column = $board->columns()->create([
            'name' => $validated['name'],
            'position' => $validated['position'] ?? 0,
        ]);

        return response()->json([
            'mensagem' => 'ok',
            'coluna' => $column,
        ], 201);
    }

    /**
     * Consulta uma coluna pertencente ao usuário autenticado.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $column = $this->findUserColumn($request, $id)
            ->with('tasks')
            ->firstOrFail();

        return response()->json([
            'mensagem' => 'ok',
            'coluna' => $column,
        ]);
    }

    /**
     * Atualiza uma coluna.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $column = $this->findUserColumn($request, $id)
            ->firstOrFail();

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'position' => ['sometimes', 'integer', 'min:0'],
        ]);

        $column->update($validated);

        return response()->json([
            'mensagem' => 'ok',
            'coluna' => $column->refresh(),
        ]);
    }

    /**
     * Exclui uma coluna.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $column = $this->findUserColumn($request, $id)
            ->firstOrFail();

        $column->delete();

        return response()->json([
            'mensagem' => 'ok',
        ]);
    }

    /**
     * Busca somente colunas pertencentes aos quadros do usuário.
     */
    private function findUserColumn(
        Request $request,
        string $id
    ): \Illuminate\Database\Eloquent\Builder {
        return BoardColumn::query()
            ->whereHas('board', function ($query) use ($request) {
                $query->where('user_id', $request->user()->id);
            })
            ->where('id', $id);
    }
}
