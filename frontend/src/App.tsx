import { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import KanbanBoard from "./components/KanbanBoard";
import { SESSION_EXPIRED_EVENT } from "./services/api";
import {
  getAuthenticatedUser,
  logout,
  type User,
} from "./services/authService";
import "./App.css";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      if (!localStorage.getItem("token")) {
        setLoading(false);
        return;
      }

      try {
        const authenticatedUser = await getAuthenticatedUser();
        setUser(authenticatedUser);
      } catch {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    }

    void checkSession();
  }, []);

  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () =>
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, []);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  }

  if (loading) {
    return <main className="loading-screen">Carregando...</main>;
  }

  if (!user) {
    return <AuthForm onAuthenticated={setUser} />;
  }

  return (
    <>
      <div className="app-user-bar">
        <span>Olá, {user.name}</span>
        <button type="button" onClick={() => void handleLogout()}>
          Sair
        </button>
      </div>

      <KanbanBoard />
    </>
  );
}
