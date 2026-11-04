import { useEffect, useId, useState, type FormEvent } from "react";
import { confirmDialog } from "../confirmDialog";
import { getApiErrorMessage, getFieldErrors } from "../services/apiErrors";
import type { Board } from "../services/boardService";
import {
  cancelInvitation,
  getSharing,
  inviteMember,
  removeMember,
  SHARE_ROLE_LABELS,
  updateMemberRole,
  type BoardInvitation,
  type BoardMember,
  type BoardSharing,
  type ShareRole,
} from "../services/memberService";
import type { PlatformUser } from "../services/userService";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Modal from "./Modal";
import UserPicker from "./UserPicker";

interface ShareBoardModalProps {
  board: Board;
  onClose: () => void;
}

const ROLES = Object.keys(SHARE_ROLE_LABELS) as ShareRole[];

// Dono do quadro: convida pessoas pelo nome (elas recebem um e-mail e
// aceitam ou recusam) e ajusta quem pode o quê.
export default function ShareBoardModal({ board, onClose }: ShareBoardModalProps) {
  const [sharing, setSharing] = useState<BoardSharing>({
    members: [],
    invitations: [],
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [person, setPerson] = useState<PlatformUser | null>(null);
  const [role, setRole] = useState<ShareRole>("viewer");
  const [personError, setPersonError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const personLabelId = useId();

  const { members, invitations } = sharing;

  // Quem não deve aparecer na busca: o dono, quem já tem acesso e quem já
  // tem convite pendente.
  const excludeIds = [
    board.user_id,
    ...members.map((member) => member.id),
    ...invitations.flatMap((invitation) =>
      invitation.invitee ? [invitation.invitee.id] : [],
    ),
  ];

  useEffect(() => {
    let active = true;

    getSharing(board.id)
      .then((data) => {
        if (active) setSharing(data);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            getApiErrorMessage(err, "Não foi possível carregar quem tem acesso."),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [board.id]);

  // Executa uma alteração bloqueando o modal e mostrando o erro, se houver.
  async function run(fallback: string, action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      await action();
    } catch (err) {
      setError(getApiErrorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!person) {
      setPersonError("Digite o nome e escolha a pessoa na lista.");
      return;
    }

    setBusy(true);
    setPersonError("");
    setError("");
    setMessage("");

    try {
      const result = await inviteMember(board.id, person.id, role);

      setSharing({ members: result.members, invitations: result.invitations });
      setPerson(null);
      setMessage(
        result.emailSent
          ? `Convite enviado para ${person.name}. O acesso começa quando o convite for aceito.`
          : `Convite criado para ${person.name}, mas o e-mail não pôde ser enviado. A pessoa verá o convite ao entrar na Nexora.`,
      );
    } catch (err) {
      const fieldError = getFieldErrors(err).user_id;

      if (fieldError) {
        setPersonError(fieldError);
      } else {
        setError(getApiErrorMessage(err, "Não foi possível enviar o convite."));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(member: BoardMember, nextRole: ShareRole) {
    await run("Não foi possível alterar a permissão.", async () => {
      setSharing(await updateMemberRole(board.id, member.id, nextRole));
    });
  }

  async function handleRemove(member: BoardMember) {
    const confirmed = await confirmDialog({
      title: `Remover o acesso de ${member.name}?`,
      text: "Essa pessoa deixará de ver este quadro.",
      danger: true,
    });

    if (!confirmed) return;

    await run("Não foi possível remover o acesso.", async () => {
      await removeMember(board.id, member.id);
      setSharing((current) => ({
        ...current,
        members: current.members.filter((item) => item.id !== member.id),
      }));
    });
  }

  async function handleCancelInvitation(invitation: BoardInvitation) {
    const name = invitation.invitee?.name ?? "esta pessoa";
    const confirmed = await confirmDialog({
      title: `Cancelar o convite de ${name}?`,
      text: "O link enviado por e-mail deixará de funcionar.",
      danger: true,
    });

    if (!confirmed) return;

    await run("Não foi possível cancelar o convite.", async () => {
      setSharing(await cancelInvitation(board.id, invitation.id));
    });
  }

  const nobody = members.length === 0 && invitations.length === 0;

  return (
    <Modal title={`Compartilhar "${board.name}"`} onClose={onClose} closeDisabled={busy}>
      <div className="share-modal">
        <form
          className="share-invite"
          onSubmit={(event) => void handleInvite(event)}
          noValidate
        >
          <div className="form-field share-invite-person">
            <span id={personLabelId}>Pessoa</span>
            <UserPicker
              value={person}
              onChange={(user) => {
                setPerson(user);
                setPersonError("");
                setMessage("");
              }}
              placeholder="Digite o nome de quem você quer convidar"
              excludeIds={excludeIds}
              invalid={Boolean(personError)}
              disabled={busy}
              labelId={personLabelId}
            />
            {personError ? (
              <span className="field-error">{personError}</span>
            ) : (
              <span className="field-hint">
                A pessoa recebe um e-mail e decide se aceita o convite.
              </span>
            )}
          </div>

          <label className="form-field">
            Permissão
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as ShareRole)}
            >
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {SHARE_ROLE_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="button button-primary" disabled={busy}>
            <Icon name="user-plus" size={16} />
            Enviar convite
          </button>
        </form>

        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <section aria-labelledby="share-members-title">
          <h3 id="share-members-title" className="share-members-title">
            Quem tem acesso
          </h3>

          {loading ? (
            <p className="muted">Carregando...</p>
          ) : nobody ? (
            <p className="share-empty">
              Só você tem acesso. Convide alguém para trabalhar junto.
            </p>
          ) : (
            <ul className="share-members">
              {members.map((member) => (
                <li key={`m-${member.id}`} className="share-member">
                  <Avatar user={member} size={36} />

                  <span className="share-member-text">
                    <span className="share-member-name">{member.name}</span>
                    <span className="share-member-email">{member.email}</span>
                  </span>

                  <select
                    className="share-member-role"
                    value={member.role}
                    onChange={(event) =>
                      void handleRoleChange(member, event.target.value as ShareRole)
                    }
                    disabled={busy}
                    aria-label={`Permissão de ${member.name}`}
                  >
                    {ROLES.map((item) => (
                      <option key={item} value={item}>
                        {SHARE_ROLE_LABELS[item]}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    onClick={() => void handleRemove(member)}
                    disabled={busy}
                    title="Remover acesso"
                    aria-label={`Remover o acesso de ${member.name}`}
                  >
                    <Icon name="x" size={16} />
                  </button>
                </li>
              ))}

              {invitations.map((invitation) =>
                invitation.invitee ? (
                  <li key={`c-${invitation.id}`} className="share-member">
                    <Avatar user={invitation.invitee} size={36} />

                    <span className="share-member-text">
                      <span className="share-member-name">
                        {invitation.invitee.name}
                      </span>
                      <span className="share-member-email">
                        {invitation.invitee.email}
                      </span>
                    </span>

                    <span
                      className="role-badge role-badge-pending"
                      title={`Convite enviado: ${SHARE_ROLE_LABELS[invitation.role].toLowerCase()}`}
                    >
                      Convite pendente
                    </span>

                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => void handleCancelInvitation(invitation)}
                      disabled={busy}
                      title="Cancelar convite"
                      aria-label={`Cancelar o convite de ${invitation.invitee.name}`}
                    >
                      <Icon name="x" size={16} />
                    </button>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
