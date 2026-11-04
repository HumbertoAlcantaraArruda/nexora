<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthorizesBoardAccess;
use App\Http\Controllers\Controller;
use App\Models\Board;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Compartilhamento de um quadro com outros usuários.
 *
 * Somente o dono lista, adiciona e altera quem tem acesso. Quem recebeu o
 * quadro pode remover a si mesmo (sair do quadro).
 */
class BoardMemberController extends Controller
{
    use AuthorizesBoardAccess;

    public function index(Request $request, string $boardId): JsonResponse
    {
        $board = $this->findBoard($request, $boardId);

        $this->ensureIsOwner($board, $request->user());

        return $this->membersResponse($board);
    }

    /**
     * Compartilha o quadro com o usuário do e-mail informado. Se ele já tem
     * acesso, só atualiza a permissão.
     */
    public function store(Request $request, string $boardId): JsonResponse
    {
        $board = $this->findBoard($request, $boardId);

        $this->ensureIsOwner($board, $request->user());

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'role' => ['required', Rule::in(Board::SHARE_ROLES)],
        ], [
            'role.in' => 'Escolha uma permissão válida.',
        ]);

        $member = User::query()->where('email', $validated['email'])->first();

        if (! $member) {
            throw ValidationException::withMessages([
                'email' => 'Nenhuma conta encontrada com este e-mail.',
            ]);
        }

        if ($member->id === $board->user_id) {
            throw ValidationException::withMessages([
                'email' => 'Você é o dono deste quadro.',
            ]);
        }

        $board->members()->syncWithoutDetaching([
            $member->id => ['role' => $validated['role']],
        ]);

        return $this->membersResponse($board, 201);
    }

    /**
     * Altera a permissão de quem já tem acesso.
     */
    public function update(Request $request, string $boardId, string $userId): JsonResponse
    {
        $board = $this->findBoard($request, $boardId);

        $this->ensureIsOwner($board, $request->user());

        $validated = $request->validate([
            'role' => ['required', Rule::in(Board::SHARE_ROLES)],
        ], [
            'role.in' => 'Escolha uma permissão válida.',
        ]);

        $board->members()->where('users.id', $userId)->firstOrFail();
        $board->members()->updateExistingPivot($userId, ['role' => $validated['role']]);

        return $this->membersResponse($board);
    }

    /**
     * Remove o acesso: o dono remove qualquer pessoa; quem recebeu o quadro
     * pode remover somente a si mesmo.
     */
    public function destroy(Request $request, string $boardId, string $userId): JsonResponse
    {
        $user = $request->user();
        $board = $this->findBoard($request, $boardId);

        if ((int) $userId !== $user->id) {
            $this->ensureIsOwner($board, $user);
        }

        $board->members()->where('users.id', $userId)->firstOrFail();
        $board->members()->detach($userId);

        return response()->json([
            'mensagem' => 'ok',
        ]);
    }

    private function findBoard(Request $request, string $boardId): Board
    {
        return Board::query()
            ->accessibleBy($request->user())
            ->findOrFail($boardId);
    }

    private function membersResponse(Board $board, int $status = 200): JsonResponse
    {
        $members = $board->members()
            ->orderBy('name')
            ->get(['users.id', 'users.name', 'users.email', 'users.avatar_path'])
            ->map(fn (User $member) => [
                'id' => $member->id,
                'name' => $member->name,
                'email' => $member->email,
                'avatar_url' => $member->avatar_url,
                'role' => $member->pivot->role,
            ]);

        return response()->json([
            'mensagem' => 'ok',
            'membros' => $members,
        ], $status);
    }
}
