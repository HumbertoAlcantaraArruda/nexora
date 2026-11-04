<?php

namespace App\Mail;

use App\Models\Board;
use App\Models\BoardInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * E-mail enviado ao convidado com o link para aceitar ou recusar o convite.
 */
class BoardInvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public BoardInvitation $invitation)
    {
        $this->invitation->loadMissing(['board', 'inviter', 'invitee']);
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->invitation->inviter->name} convidou você para o quadro \"{$this->invitation->board->name}\"",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.board-invitation',
            with: [
                'inviteeName' => $this->invitation->invitee->name,
                'inviterName' => $this->invitation->inviter->name,
                'boardName' => $this->invitation->board->name,
                'boardDescription' => $this->invitation->board->description,
                'roleLabel' => $this->invitation->role === Board::ROLE_EDITOR
                    ? 'pode editar colunas e tarefas'
                    : 'pode visualizar o quadro',
                'url' => $this->invitation->frontendUrl(),
            ],
        );
    }
}
