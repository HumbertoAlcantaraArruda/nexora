<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthorizesBoardAccess;
use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    use AuthorizesBoardAccess;

    /**
     * Lista os quadros do usuário e os compartilhados com ele, com a
     * quantidade de colunas e tarefas, o dono e a permissão de cada um.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $boards = Board::query()
            ->accessibleBy($user)
            ->with($this->currentMembership($user))
            ->withCount(['columns', 'tasks'])
            ->latest()
            ->get()
            ->each(fn (Board $board) => $board->presentFor($user));

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
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $board = $request->user()
            ->boards()
            ->create($validated);

        return response()->json([
            'mensagem' => 'ok',
            'quadro' => $board->presentFor($request->user()),
        ], 201);
    }

    /**
     * Exibe um quadro (próprio ou compartilhado) com colunas e tarefas.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $board = Board::query()
            ->accessibleBy($user)
            ->with(['columns.tasks', ...$this->currentMembership($user)])
            ->findOrFail($id);

        return response()->json([
            'mensagem' => 'ok',
            'quadro' => $board->presentFor($user),
        ]);
    }

    /**
     * Atualiza nome e descrição. Somente o dono.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $board = Board::query()->accessibleBy($user)->findOrFail($id);

        $this->ensureIsOwner($board, $user);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $board->update($validated);

        return response()->json([
            'mensagem' => 'ok',
            'quadro' => $board->refresh()->presentFor($user),
        ]);
    }

    /**
     * Exclui um quadro. Somente o dono. Colunas, tarefas e compartilhamentos
     * são removidos em cascata pelas chaves estrangeiras.
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $board = Board::query()->accessibleBy($user)->findOrFail($id);

        $this->ensureIsOwner($board, $user);

        $board->delete();

        return response()->json([
            'mensagem' => 'ok',
        ]);
    }

    /**
     * Carrega só o vínculo do usuário atual com o quadro, para calcular a
     * permissão sem consultas extras por quadro.
     *
     * @return array<string, \Closure>
     */
    private function currentMembership(User $user): array
    {
        return [
            'members' => fn ($query) => $query->where('users.id', $user->id),
        ];
    }
}
