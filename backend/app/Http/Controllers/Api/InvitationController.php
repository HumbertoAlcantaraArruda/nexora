<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BoardInvitation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * Convites do lado de quem foi convidado: ver, aceitar e recusar.
 *
 * Cada pessoa só enxerga os próprios convites; os de outras pessoas
 * respondem 404.
 */
class InvitationController extends Controller
{
    /**
     * Convites pendentes do usuário.
     */
    public function index(Request $request): JsonResponse
    {
        $invitations = BoardInvitation::query()
            ->pending()
            ->where('invitee_id', $request->user()->id)
            ->with(['board:id,name,description', 'inviter', 'invitee'])
            ->latest()
            ->get()
            ->map(fn (BoardInvitation $invitation) => $invitation->toApi());

        return response()->json([
            'mensagem' => 'ok',
            'convites' => $invitations,
        ]);
    }

    /**
     * Um convite do usuário (de qualquer situação), aberto pelo link do
     * e-mail.
     */
    public function show(Request $request, string $id): JsonResponse
    {
        return response()->json([
            'mensagem' => 'ok',
            'convite' => $this->findOwn($request, $id)->toApi(),
        ]);
    }

    /**
     * Aceita o convite: a pessoa passa a acessar o quadro com a permissão
     * do convite.
     */
    public function accept(Request $request, string $id): JsonResponse
    {
        $invitation = $this->findOwn($request, $id);

        $this->ensurePending($invitation);

        DB::transaction(function () use ($invitation) {
            $invitation->board->members()->syncWithoutDetaching([
                $invitation->invitee_id => ['role' => $invitation->role],
            ]);

            $invitation->update([
                'status' => BoardInvitation::STATUS_ACCEPTED,
                'responded_at' => now(),
            ]);
        });

        return response()->json([
            'mensagem' => 'ok',
            'convite' => $invitation->refresh()->toApi(),
        ]);
    }

    /**
     * Recusa o convite: nada muda no acesso ao quadro.
     */
    public function decline(Request $request, string $id): JsonResponse
    {
        $invitation = $this->findOwn($request, $id);

        $this->ensurePending($invitation);

        $invitation->update([
            'status' => BoardInvitation::STATUS_DECLINED,
            'responded_at' => now(),
        ]);

        return response()->json([
            'mensagem' => 'ok',
            'convite' => $invitation->refresh()->toApi(),
        ]);
    }

    private function findOwn(Request $request, string $id): BoardInvitation
    {
        return BoardInvitation::query()
            ->where('invitee_id', $request->user()->id)
            ->with(['board', 'inviter', 'invitee'])
            ->findOrFail($id);
    }

    private function ensurePending(BoardInvitation $invitation): void
    {
        if (! $invitation->isPending()) {
            throw new HttpException(409, 'Este convite já foi respondido.');
        }
    }
}
