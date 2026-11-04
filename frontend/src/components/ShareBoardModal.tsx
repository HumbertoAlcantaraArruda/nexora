import { useEffect, useState, type FormEvent } from "react";
import { confirmDialog } from "../confirmDialog";
import { getApiErrorMessage, getFieldErrors } from "../services/apiErrors";
import type { Board } from "../services/boardService";
import {
  addMember,
  getMembers,
  removeMember,
  SHARE_ROLE_LABELS,
  updateMemberRole,
  type BoardMember,
  type ShareRole,
} from "../services/memberService";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Modal from "./Modal";

interface ShareBoardModalProps {
  board: Board;
  onClose: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = Object.keys(SHARE_ROLE_LABELS) as ShareRole[];

// Dono do quadro: convida pessoas pelo e-mail e ajusta quem pode o quê.
export default function ShareBoardModal({ board, onClose }: ShareBoardModalProps) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("viewer");
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    getMembers(board.id)
      .then((list) => {
        if (active) setMembers(list);
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
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = email.trim();

    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError("Informe um e-mail válido.");
      return;
    }

    setBusy(true);
    setEmailError("");
    setError("");
    setMessage("");

    try {
      const list = await addMember(board.id, trimmed, role);
      const added = list.find(
        (member) => member.email.toLowerCase() === trimmed.toLowerCase(),
      );

      setMembers(list);
      setEmail("");
      setMessage(
        added
          ? `${added.name} agora ${role === "editor" ? "pode editar" : "pode visualizar"} este quadro.`
          : "Quadro compartilhado.",
      );
    } catch (err) {
      const fieldError = getFieldErrors(err).email;

      if (fieldError) {
        setEmailError(fieldError);
      } else {
        setError(getApiErrorMessage(err, "Não foi possível compartilhar."));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(member: BoardMember, nextRole: ShareRole) {
    await run("Não foi possível alterar a permissão.", async () => {
      setMembers(await updateMemberRole(board.id, member.id, nextRole));
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
      setMembers((current) => current.filter((item) => item.id !== member.id));
    });
  }

  return (
    <Modal title={`Compartilhar "${board.name}"`} onClose={onClose} closeDisabled={busy}>
      <div className="share-modal">
        <form
          className="share-invite"
          onSubmit={(event) => void handleInvite(event)}
          noValidate
        >
          <label className="form-field share-invite-email">
            E-mail da pessoa
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError("");
                setMessage("");
              }}
              placeholder="nome@exemplo.com"
              aria-invalid={emailError ? true : undefined}
              autoFocus
            />
            {emailError ? (
              <span className="field-error">{emailError}</span>
            ) : (
              <span className="field-hint">A pessoa precisa ter uma conta.</span>
            )}
          </label>

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
            Compartilhar
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
          ) : members.length === 0 ? (
            <p className="share-empty">
              Só você tem acesso. Compartilhe para trabalhar junto.
            </p>
          ) : (
            <ul className="share-members">
              {members.map((member) => (
                <li key={member.id} className="share-member">
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
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
