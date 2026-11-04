import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../services/apiErrors";
import {
  getInvitation,
  SHARE_ROLE_LABELS,
  type BoardInvitation,
} from "../services/memberService";
import Avatar from "./Avatar";
import Icon from "./Icon";
import TopBar from "./TopBar";

interface InvitationPageProps {
  invitationId: number;
  busy: boolean;
  onAccept: (invitation: BoardInvitation) => Promise<void>;
  onDecline: (invitation: BoardInvitation) => Promise<void>;
  onGoHome: () => void;
  onOpenBoard: (boardId: number) => void;
}

// Página aberta pelo link do e-mail de convite: mostra o quadro, quem
// convidou e a permissão, com os botões Aceitar e Recusar.
export default function InvitationPage({
  invitationId,
  busy,
  onAccept,
  onDecline,
  onGoHome,
  onOpenBoard,
}: InvitationPageProps) {
  const [invitation, setInvitation] = useState<BoardInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getInvitation(invitationId)
      .then((data) => {
        if (active) setInvitation(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            getApiErrorMessage(
              err,
              "Não foi possível abrir este convite.",
            ),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [invitationId]);

  function renderContent() {
    if (loading) {
      return <p className="muted">Carregando convite...</p>;
    }

    if (!invitation || !invitation.board) {
      return (
        <div className="empty-state">
          <Icon name="users" size={40} />
          <h2>Convite não encontrado</h2>
          <p>
            {error ||
              "Ele pode ter sido cancelado, ou foi enviado para outra conta. Confira se você entrou com o e-mail que recebeu o convite."}
          </p>
          <button type="button" className="button button-primary" onClick={onGoHome}>
            Ir para Meus quadros
          </button>
        </div>
      );
    }

    if (invitation.status === "accepted") {
      return (
        <div className="empty-state">
          <Icon name="check" size={40} />
          <h2>Você já aceitou este convite</h2>
          <p>O quadro "{invitation.board.name}" está em Compartilhados comigo.</p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => invitation.board && onOpenBoard(invitation.board.id)}
          >
            Abrir quadro
          </button>
        </div>
      );
    }

    if (invitation.status === "declined") {
      return (
        <div className="empty-state">
          <Icon name="x" size={40} />
          <h2>Você recusou este convite</h2>
          <p>Se mudar de ideia, peça para ser convidado de novo.</p>
          <button type="button" className="button button-primary" onClick={onGoHome}>
            Ir para Meus quadros
          </button>
        </div>
      );
    }

    return (
      <InvitationCard
        invitation={invitation}
        busy={busy}
        onAccept={() => void onAccept(invitation)}
        onDecline={() => void onDecline(invitation)}
      />
    );
  }

  return (
    <>
      <TopBar title="Convite" subtitle="Aceite para começar a usar o quadro." />
      <div className="page-content">
        <div className="invitation-page">{renderContent()}</div>
      </div>
    </>
  );
}

interface InvitationCardProps {
  invitation: BoardInvitation;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

// Cartão de um convite pendente (usado na página do convite e em Meus quadros).
export function InvitationCard({
  invitation,
  busy,
  onAccept,
  onDecline,
}: InvitationCardProps) {
  const inviter = invitation.inviter;

  return (
    <article className="invitation-card">
      <div className="invitation-card-header">
        {inviter && <Avatar user={inviter} size={40} />}
        <p>
          <strong>{inviter?.name ?? "Alguém"}</strong> convidou você para o
          quadro <strong>{invitation.board?.name}</strong>
        </p>
      </div>

      {invitation.board?.description && (
        <p className="invitation-card-description">
          {invitation.board.description}
        </p>
      )}

      <div className="invitation-card-footer">
        <span className={`role-badge role-badge-${invitation.role}`}>
          {SHARE_ROLE_LABELS[invitation.role]}
        </span>

        <div className="invitation-card-actions">
          <button
            type="button"
            className="button button-secondary"
            onClick={onDecline}
            disabled={busy}
          >
            Recusar
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={onAccept}
            disabled={busy}
          >
            <Icon name="check" size={16} />
            Aceitar
          </button>
        </div>
      </div>
    </article>
  );
}
