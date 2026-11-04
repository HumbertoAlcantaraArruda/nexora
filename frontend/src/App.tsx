import { useEffect, useState } from "react";
import AuthForm from "./components/AuthForm";
import BoardList from "./components/BoardList";
import KanbanBoard from "./components/KanbanBoard";
import ThemeToggle from "./components/ThemeToggle";
import { SESSION_EXPIRED_EVENT } from "./services/api";
import {
  getAuthenticatedUser,
  logout,
  type User,
} from "./services/authService";
import { getBoardIdFromHash, goToBoard, goToBoardList } from "./navigation";
import "./App.css";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState<number | null>(getBoardIdFromHash);

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

  // O quadro aberto vem do endereço (#/quadros/ID): funciona com recarregar
  // a página e com o botão "Voltar" do navegador.
  useEffect(() => {
    function handleHashChange() {
      setBoardId(getBoardIdFromHash());
      // Cada tela começa do topo (senão herda a rolagem da tela anterior).
      window.scrollTo(0, 0);
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Após o login o usuário sempre começa na tela "Meus quadros".
  function handleAuthenticated(authenticatedUser: User) {
    goToBoardList();
    setBoardId(null);
    setUser(authenticatedUser);
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      localStorage.removeItem("token");
      goToBoardList();
      setBoardId(null);
      setUser(null);
    }
  }

  if (loading) {
    return <main className="loading-screen">Carregando...</main>;
  }

  if (!user) {
    return <AuthForm onAuthenticated={handleAuthenticated} />;
  }

  return (
    <>
      <div className="app-user-bar">
        <button
          type="button"
          className="app-brand"
          onClick={goToBoardList}
          title="Ir para Meus quadros"
        >
          Meu Kanban
        </button>

        <div className="app-user-actions">
          <ThemeToggle />
          <span>Olá, {user.name}</span>
          <button type="button" onClick={() => void handleLogout()}>
            Sair
          </button>
        </div>
      </div>

      {boardId === null ? (
        <BoardList onOpenBoard={goToBoard} />
      ) : (
        <KanbanBoard key={boardId} boardId={boardId} onBack={goToBoardList} />
      )}
    </>
  );
}
