import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { AVATAR_ACCEPT, validateAvatarFile } from "../avatarFile";
import { getFieldErrors } from "../services/apiErrors";
import { login, register } from "../services/authService";
import type { User } from "../services/authService";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Logo from "./Logo";

interface AuthFormProps {
  onAuthenticated: (user: User) => void;
}

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Libera a prévia da foto da memória ao trocar de foto ou sair da tela.
  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // Limpa a seleção para permitir escolher o mesmo arquivo de novo.
    event.target.value = "";

    if (!file) return;

    const invalid = validateAvatarFile(file);

    if (invalid) {
      setAvatarError(invalid);
      return;
    }

    setAvatarError("");
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function clearAvatar() {
    setAvatar(null);
    setAvatarPreview(null);
    setAvatarError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = isRegister
        ? await register(
            {
              name,
              email,
              password,
              password_confirmation: passwordConfirmation,
            },
            avatar,
          )
        : await login({ email, password });

      onAuthenticated(response.usuario);
    } catch (err) {
      if (!isRegister) {
        setError("E-mail ou senha inválidos.");
        return;
      }

      // Mostra o motivo enviado pelo servidor (ex.: e-mail já em uso).
      const fieldErrors = getFieldErrors(err);

      if (fieldErrors.avatar) setAvatarError(fieldErrors.avatar);

      setError(
        fieldErrors.name ??
          fieldErrors.email ??
          fieldErrors.password ??
          (fieldErrors.avatar
            ? ""
            : "Não foi possível realizar o cadastro. Confira os dados informados."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <Logo />

        <div className="auth-heading">
          <h1>{isRegister ? "Crie sua conta" : "Bem-vindo de volta"}</h1>
          <p>
            {isRegister
              ? "Comece a organizar suas tarefas em quadros."
              : "Entre para acessar seus quadros."}
          </p>
        </div>

        {isRegister && (
          <div className="auth-avatar">
            <button
              type="button"
              className="auth-avatar-preview"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              title={avatar ? "Trocar foto" : "Escolher foto"}
              aria-label={avatar ? "Trocar foto de perfil" : "Escolher foto de perfil"}
            >
              {avatar || name.trim() ? (
                <Avatar user={{ name, avatar_url: avatarPreview }} size={72} />
              ) : (
                <span className="auth-avatar-empty">
                  <Icon name="plus" size={22} />
                </span>
              )}
            </button>

            <div className="auth-avatar-text">
              <span className="auth-avatar-title">Foto de perfil</span>
              <span className="field-hint">
                Opcional. JPG, PNG ou WEBP, até 2 MB.
              </span>

              <div className="auth-avatar-actions">
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                >
                  {avatar ? "Trocar foto" : "Escolher foto"}
                </button>
                {avatar && (
                  <button
                    type="button"
                    className="auth-link auth-link-danger"
                    onClick={clearAvatar}
                    disabled={loading}
                  >
                    Remover
                  </button>
                )}
              </div>

              {avatarError && (
                <span className="field-error" role="alert">
                  {avatarError}
                </span>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept={AVATAR_ACCEPT}
              hidden
              onChange={chooseAvatar}
            />
          </div>
        )}

        {isRegister && (
          <label className="form-field">
            Nome
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
        )}

        <label className="form-field">
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
        </label>

        {isRegister && (
          <label className="form-field">
            Confirme sua senha
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              minLength={8}
              required
            />
          </label>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="button button-primary"
          disabled={loading}
        >
          {loading ? "Aguarde..." : isRegister ? "Cadastrar" : "Entrar"}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
            setAvatarError("");
          }}
        >
          {isRegister ? "Já tenho uma conta" : "Ainda não tenho uma conta"}
        </button>
      </form>
    </main>
  );
}
