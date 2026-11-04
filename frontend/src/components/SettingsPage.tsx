import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { AVATAR_ACCEPT, validateAvatarFile } from "../avatarFile";
import { confirmDialog } from "../confirmDialog";
import { getApiErrorMessage, getFieldErrors } from "../services/apiErrors";
import {
  removeAvatar,
  updateProfile,
  uploadAvatar,
  type User,
} from "../services/authService";
import Avatar from "./Avatar";
import TopBar from "./TopBar";

interface SettingsPageProps {
  user: User;
  onUserUpdated: (user: User) => void;
}

const NAME_MAX = 255;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = Partial<Record<"name" | "email" | "current_password", string>>;

// Configurações do usuário: foto de perfil, nome e e-mail.
export default function SettingsPage({ user, onUserUpdated }: SettingsPageProps) {
  return (
    <>
      <TopBar
        title="Configurações"
        subtitle="Gerencie sua foto de perfil e seus dados de acesso."
      />

      <div className="page-content">
        <div className="settings">
          <AvatarSection user={user} onUserUpdated={onUserUpdated} />
          <ProfileSection user={user} onUserUpdated={onUserUpdated} />
        </div>
      </div>
    </>
  );
}

function AvatarSection({ user, onUserUpdated }: SettingsPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Limpa a seleção para permitir escolher o mesmo arquivo de novo.
    event.target.value = "";

    if (!file) return;

    setMessage("");

    const invalid = validateAvatarFile(file);

    if (invalid) {
      setError(invalid);
      return;
    }

    setBusy(true);
    setError("");

    try {
      onUserUpdated(await uploadAvatar(file));
      setMessage("Foto atualizada.");
    } catch (err) {
      setError(
        getFieldErrors(err).avatar ??
          getApiErrorMessage(err, "Não foi possível enviar a foto."),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    const confirmed = await confirmDialog({
      title: "Remover a foto de perfil?",
      text: "Suas iniciais voltarão a aparecer no lugar da foto.",
      danger: true,
    });

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      onUserUpdated(await removeAvatar());
      setMessage("Foto removida.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível remover a foto."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="settings-card" aria-labelledby="settings-avatar-title">
      <header className="settings-card-header">
        <h2 id="settings-avatar-title">Foto de perfil</h2>
        <p>Aparece na barra lateral. JPG, PNG ou WEBP, até 2 MB.</p>
      </header>

      <div className="settings-avatar">
        <Avatar user={user} size={88} />

        <div className="settings-avatar-actions">
          <input
            ref={inputRef}
            type="file"
            accept={AVATAR_ACCEPT}
            hidden
            onChange={(event) => void handleFileChange(event)}
          />
          <button
            type="button"
            className="button button-primary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? "Salvando..." : user.avatar_url ? "Trocar foto" : "Enviar foto"}
          </button>

          {user.avatar_url && (
            <button
              type="button"
              className="button button-danger-ghost"
              onClick={() => void handleRemove()}
              disabled={busy}
            >
              Remover
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function ProfileSection({ user, onUserUpdated }: SettingsPageProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [message, setMessage] = useState("");

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const emailChanged = trimmedEmail !== user.email;
  const changed = trimmedName !== user.name || emailChanged;

  function clearFeedback(field: keyof FieldErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validação no frontend para feedback imediato; o backend valida novamente.
    const found: FieldErrors = {};

    if (!trimmedName) {
      found.name = "Informe seu nome.";
    } else if (trimmedName.length > NAME_MAX) {
      found.name = `O nome deve ter no máximo ${NAME_MAX} caracteres.`;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      found.email = "Informe um e-mail válido.";
    }

    if (emailChanged && !currentPassword) {
      found.current_password = "Informe sua senha atual para trocar o e-mail.";
    }

    setErrors(found);
    setFormError("");
    setMessage("");

    if (Object.keys(found).length > 0 || !changed) return;

    setSaving(true);

    try {
      const updated = await updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        ...(emailChanged ? { current_password: currentPassword } : {}),
      });

      onUserUpdated(updated);
      setName(updated.name);
      setEmail(updated.email);
      setCurrentPassword("");
      setMessage("Alterações salvas.");
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      const known: FieldErrors = {
        name: fieldErrors.name,
        email: fieldErrors.email,
        current_password: fieldErrors.current_password,
      };

      if (known.name || known.email || known.current_password) {
        setErrors(known);
      } else {
        setFormError(getApiErrorMessage(err, "Não foi possível salvar."));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-card" aria-labelledby="settings-profile-title">
      <header className="settings-card-header">
        <h2 id="settings-profile-title">Dados da conta</h2>
        <p>Seu nome aparece na barra lateral; o e-mail é usado para entrar.</p>
      </header>

      <form
        className="settings-form"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <label className="form-field">
          Nome
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFeedback("name");
            }}
            maxLength={NAME_MAX}
            autoComplete="name"
            aria-invalid={errors.name ? true : undefined}
            required
          />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </label>

        <label className="form-field">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFeedback("email");
            }}
            maxLength={NAME_MAX}
            autoComplete="email"
            aria-invalid={errors.email ? true : undefined}
            required
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>

        {emailChanged && (
          <label className="form-field">
            Senha atual
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => {
                setCurrentPassword(event.target.value);
                clearFeedback("current_password");
              }}
              autoComplete="current-password"
              aria-invalid={errors.current_password ? true : undefined}
              required
            />
            {errors.current_password ? (
              <span className="field-error">{errors.current_password}</span>
            ) : (
              <span className="field-hint">
                Por segurança, confirme sua senha para trocar o e-mail.
              </span>
            )}
          </label>
        )}

        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}

        <div className="settings-form-actions">
          <button
            type="submit"
            className="button button-primary"
            disabled={saving || !changed}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </form>
    </section>
  );
}
