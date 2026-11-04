import { useState, type FormEvent } from "react";
import { login, register } from "../services/authService";
import type { User } from "../services/authService";

interface AuthFormProps {
  onAuthenticated: (user: User) => void;
}

export default function AuthForm({ onAuthenticated }: AuthFormProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = isRegister
        ? await register({
            name,
            email,
            password,
            password_confirmation: passwordConfirmation,
          })
        : await login({ email, password });

      onAuthenticated(response.usuario);
    } catch {
      setError(
        isRegister
          ? "Não foi possível realizar o cadastro. Confira os dados informados."
          : "E-mail ou senha inválidos.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-container">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Meu Kanban</h1>
        <p>{isRegister ? "Crie sua conta" : "Entre na sua conta"}</p>

        {isRegister && (
          <label>
            Nome
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
        )}

        <label>
          E-mail
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label>
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
          <label>
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

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Aguarde..." : isRegister ? "Cadastrar" : "Entrar"}
        </button>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
          }}
        >
          {isRegister ? "Já tenho uma conta" : "Ainda não tenho uma conta"}
        </button>
      </form>
    </main>
  );
}
