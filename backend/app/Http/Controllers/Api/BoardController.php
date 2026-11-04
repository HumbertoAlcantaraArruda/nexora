<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Board;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    /**
     * Lista os quadros do usuário autenticado, com a quantidade de colunas
     * e tarefas de cada um (exibida na tela de quadros).
     */
    public function index(Request $request): JsonResponse
    {
        $boards = $request->user()
            ->boards()
            ->withCount(['columns', 'tasks'])
            ->latest()
            ->get();

        return response()->json([
            'mensagem' => 'ok',
            'quadros' => $boards,
        ]);
    }

    /**
     * Cria um novo quadro.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $board = $request->user()
            ->boards()
            ->create($validated);

        return response()->json([
            'mensagem' => 'ok',
            'quadro' => $board,
        ], 201);
    }

    /**
     * Exibe um quadro específico.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $board = $this->findUserBoard($request, $id)
            ->with('columns.tasks')
            ->firstOrFail();

        return response()->json([
            'mensagem' => 'ok',
            'quadro' => $board,
        ]);
    }

    /**
     * Atualiza um quadro.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $board = $this->findUserBoard($request, $id)->firstOrFail();

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
        ]);

        $board->update($validated);

        return response()->json([
            'mensagem' => 'ok',
            'quadro' => $board->refresh(),
        ]);
    }

    /**
     * Exclui um quadro. Colunas e tarefas são removidas em cascata pelas
     * chaves estrangeiras.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $board = $this->findUserBoard($request, $id)->firstOrFail();

        $board->delete();

        return response()->json([
            'mensagem' => 'ok',
        ]);
    }

    /**
     * Busca somente quadros pertencentes ao usuário autenticado.
     */
    private function findUserBoard(Request $request, string $id): Builder
    {
        return Board::query()
            ->where('user_id', $request->user()->id)
            ->where('id', $id);
    }
}
