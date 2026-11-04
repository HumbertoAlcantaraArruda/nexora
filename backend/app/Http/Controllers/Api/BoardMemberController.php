<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthorizesBoardAccess;
use App\Http\Controllers\Controller;
use App\Mail\BoardInvitationMail;
use App\Models\Board;
use App\Models\BoardInvitation;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Compartilhamento de um quadro, do lado do dono.
 *
 * O dono convida pessoas (que recebem um e-mail e aceitam ou recusam),
 * altera permissões e remove acessos. Quem recebeu o quadro pode remover a
 * si mesmo (sair do quadro).
 */
class BoardMemberController extends Controller
{
    use AuthorizesBoardAccess;

    /**
     * Pessoas com acesso e convites pendentes.
     */
    public function index(Request $request, string $boardId): JsonResponse
    {
        $board = $this->findBoard($request, $boardId);

        $this->ensureIsOwner($board, $request->user());

        return $this->sharingResponse($board);
    }

    /**
     * Convida um usuário. Se já houver convite pendente para ele, atualiza a
     * permissão e reenvia o e-mail.
     */
    public function invite(Request $request, string $boardId): JsonResponse
    {
        $user = $request->user();
        $board = $this->findBoard($request, $boardId);

        $this->ensureIsOwner($board, $user);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'role' => ['required', Rule::in(Board::SHARE_ROLES)],
        ], [
            'user_id.exists' => 'Usuário não encontrado.',
            'role.in' => 'Escolha uma permissão válida.',
        ]);

        $inviteeId = (int) $validated['user_id'];

        if ($inviteeId === $board->user_id) {
            throw ValidationException::withMessages([
                'user_id' => 'Você é o dono deste quadro.',
            ]);
        }

        if ($board->members()->where('users.id', $inviteeId)->exists()) {
            throw ValidationException::withMessages([
                'user_id' => 'Essa pessoa já tem acesso ao quadro.',
            ]);
        }

        $invitation = BoardInvitation::query()
            ->pending()
            ->where('board_id', $board->id)
            ->where('invitee_id', $inviteeId)
            ->first();

        if ($invitation) {
            $invitation->update(['role' => $validated['role'], 'inviter_id' => $user->id]);
        } else {
            $invitation = BoardInvitation::create([
                'board_id' => $board->id,
                'inviter_id' => $user->id,
                'invitee_id' => $inviteeId,
                'role' => $validated['role'],
                'status' => BoardInvitation::STATUS_PENDING,
            ]);
        }

        // O convite vale mesmo se o e-mail falhar: o convidado também o vê
        // ao entrar na Nexora.
        $emailSent = true;

        try {
            Mail::to($invitation->invitee()->first())->send(new BoardInvitationMail($invitation));
        } catch (Throwable $exception) {
            report($exception);
            $emailSent = false;
        }

        return $this->sharingResponse($board, 201, [
            'convite' => $invitation->refresh()->toApi(),
            'email_enviado' => $emailSent,
        ]);
    }

    /**
     * Cancela um convite pendente.
     */
    public function cancelInvitation(Request $request, string $boardId, string $invitationId): JsonResponse
    {
        $board = $this->findBoard($request, $boardId);

        $this->ensureIsOwner($board, $request->user());

        BoardInvitation::query()
            ->pending()
            ->where('board_id', $board->id)
            ->findOrFail($invitationId)
            ->delete();

        return $this->sharingResponse($board);
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

        return $this->sharingResponse($board);
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

    /**
     * @param  array<string, mixed>  $extra
     */
    private function sharingResponse(Board $board, int $status = 200, array $extra = []): JsonResponse
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

        $invitations = BoardInvitation::query()
            ->pending()
            ->where('board_id', $board->id)
            ->with(['board:id,name,description', 'inviter', 'invitee'])
            ->latest()
            ->get()
            ->map(fn (BoardInvitation $invitation) => $invitation->toApi());

        return response()->json([
            'mensagem' => 'ok',
            'membros' => $members,
            'convites' => $invitations,
            ...$extra,
        ], $status);
    }
}
