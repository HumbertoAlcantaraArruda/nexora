import { useCallback, useEffect, useRef, useState } from "react";
import AuthForm from "./components/AuthForm";
import BoardFormModal, { type BoardFormData } from "./components/BoardFormModal";
import BoardList from "./components/BoardList";
import Icon from "./components/Icon";
import KanbanBoard from "./components/KanbanBoard";
import Sidebar from "./components/Sidebar";
import { confirmDialog } from "./confirmDialog";
import { SESSION_EXPIRED_EVENT } from "./services/api";
import { getApiErrorMessage } from "./services/apiErrors";
import {
  getAuthenticatedUser,
  logout,
  type User,
} from "./services/authService";
import {
  createBoard,
  deleteBoard,
  getBoards,
  updateBoard,
  type Board,
} from "./services/boardService";
import { getBoardIdFromHash, goToBoard, goToBoardList } from "./navigation";
import "./App.css";

const SIDEBAR_STORAGE_KEY = "sidebar-hidden";
const MOBILE_QUERY = "(max-width: 768px)";

// No celular a barra lateral começa fechada (vira uma gaveta sobre o conteúdo);
// no desktop vale a última escolha do usuário.
function getInitialSidebarHidden() {
  if (window.matchMedia(MOBILE_QUERY).matches) return true;

  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

type BoardModalState = { mode: "create" } | { mode: "edit"; board: Board } | null;

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState<number | null>(getBoardIdFromHash);
  const [sidebarHidden, setSidebarHidden] = useState(getInitialSidebarHidden);

  // Quadros do usuário: compartilhados pela barra lateral, tela inicial e
  // cabeçalho do quadro aberto.
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [boardsError, setBoardsError] = useState("");
  const [boardBusy, setBoardBusy] = useState(false);
  const [boardModal, setBoardModal] = useState<BoardModalState>(null);
  const [boardModalError, setBoardModalError] = useState("");
  const boardsLoadedRef = useRef(false);

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
      window.scrollTo(0, 0);

      // No celular a gaveta fecha ao navegar.
      if (window.matchMedia(MOBILE_QUERY).matches) setSidebarHidden(true);
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const loadBoards = useCallback(async () => {
    try {
      setBoards(await getBoards());
      setBoardsError("");
    } catch (err) {
      setBoardsError(
        getApiErrorMessage(err, "Não foi possível carregar os quadros."),
      );
    } finally {
      boardsLoadedRef.current = true;
      setBoardsLoading(false);
    }
  }, []);

  // Carrega os quadros após o login (inclusive ao abrir um quadro direto
  // pelo endereço) e ao voltar para a tela inicial, o que atualiza as
  // contagens de colunas e tarefas.
  useEffect(() => {
    if (user && (boardId === null || !boardsLoadedRef.current)) {
      void loadBoards();
    }
  }, [user, boardId, loadBoards]);

  // Quadro aberto que não está na lista (ex.: criado em outra aba): recarrega
  // a lista uma vez para ele aparecer na barra lateral. A marcação evita
  // repetir a busca para um quadro que realmente não existe.
  const missingBoardRef = useRef<number | null>(null);

  useEffect(() => {
    if (
      user &&
      boardId !== null &&
      !boardsLoading &&
      !boards.some((board) => board.id === boardId) &&
      missingBoardRef.current !== boardId
    ) {
      missingBoardRef.current = boardId;
      void loadBoards();
    }
  }, [user, boardId, boards, boardsLoading, loadBoards]);

  function setSidebar(hidden: boolean) {
    setSidebarHidden(hidden);

    if (!window.matchMedia(MOBILE_QUERY).matches) {
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(hidden));
      } catch {
        // Sem armazenamento: a escolha vale só para esta sessão.
      }
    }
  }

  // Após o login o usuário sempre começa na tela "Meus quadros".
  function handleAuthenticated(authenticatedUser: User) {
    goToBoardList();
    setBoardId(null);
    boardsLoadedRef.current = false;
    setBoardsLoading(true);
    setUser(authenticatedUser);
  }

  async function handleLogout() {
    try {
      await logout();
    } finally {
      localStorage.removeItem("token");
      goToBoardList();
      setBoardId(null);
      setBoards([]);
      boardsLoadedRef.current = false;
      setBoardsLoading(true);
      setUser(null);
    }
  }

  // ---- Quadros: criar, editar e excluir -------------------------------------

  function openBoardModal(state: BoardModalState) {
    setBoardModalError("");
    setBoardModal(state);
  }

  async function handleSaveBoard(data: BoardFormData): Promise<boolean> {
    const modal = boardModal;

    if (!modal) return false;

    if (
      modal.mode === "edit" &&
      data.name === modal.board.name &&
      data.description === modal.board.description
    ) {
      setBoardModal(null);
      return true;
    }

    setBoardBusy(true);
    setBoardModalError("");

    try {
      if (modal.mode === "create") {
        const board = await createBoard(data);

        setBoards((current) => [
          { ...board, columns_count: 0, tasks_count: 0 },
          ...current,
        ]);
        setBoardModal(null);
        goToBoard(board.id);
      } else {
        const updated = await updateBoard(modal.board.id, data);

        // A resposta não traz as contagens; preserva as que já estavam na tela.
        setBoards((current) =>
          current.map((item) =>
            item.id === updated.id
              ? { ...item, name: updated.name, description: updated.description }
              : item,
          ),
        );
        setBoardModal(null);
      }

      return true;
    } catch (err) {
      setBoardModalError(
        getApiErrorMessage(
          err,
          modal.mode === "create"
            ? "Não foi possível criar o quadro."
            : "Não foi possível salvar o quadro.",
        ),
      );
      return false;
    } finally {
      setBoardBusy(false);
    }
  }

  async function handleDeleteBoard(board: Board) {
    const columnsCount = board.columns_count ?? 0;
    const tasksCount = board.tasks_count ?? 0;

    // Menciona só o conteúdo que existe (evita "apaga 0 colunas e 0 tarefas").
    const content = [
      columnsCount > 0 && plural(columnsCount, "coluna", "colunas"),
      tasksCount > 0 && plural(tasksCount, "tarefa", "tarefas"),
    ]
      .filter(Boolean)
      .join(" e ");

    const confirmed = await confirmDialog({
      title: `Excluir o quadro "${board.name}"?`,
      text: content
        ? `Isso também apaga ${content}. Esta ação não pode ser desfeita.`
        : "Esta ação não pode ser desfeita.",
      danger: true,
    });

    if (!confirmed) return;

    setBoardBusy(true);
    setBoardsError("");

    try {
      await deleteBoard(board.id);
      setBoards((current) => current.filter((item) => item.id !== board.id));

      if (boardId === board.id) goToBoardList();
    } catch (err) {
      setBoardsError(
        getApiErrorMessage(err, "Não foi possível excluir o quadro."),
      );
      if (boardId === board.id) goToBoardList();
      await loadBoards();
    } finally {
      setBoardBusy(false);
    }
  }

  if (loading) {
    return <main className="loading-screen">Carregando...</main>;
  }

  if (!user) {
    return <AuthForm onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className={`app-shell${sidebarHidden ? " sidebar-hidden" : ""}`}>
      <Sidebar
        boards={boards}
        activeBoardId={boardId}
        user={user}
        onGoHome={goToBoardList}
        onOpenBoard={goToBoard}
        onCreateBoard={() => openBoardModal({ mode: "create" })}
        onHide={() => setSidebar(true)}
        onLogout={() => void handleLogout()}
      />

      {/* Fundo escurecido da gaveta no celular. */}
      <div
        className="sidebar-backdrop"
        onClick={() => setSidebar(true)}
        aria-hidden="true"
      />

      <main className="app-main">
        {boardId === null ? (
          <BoardList
            boards={boards}
            loading={boardsLoading}
            error={boardsError}
            busy={boardBusy}
            sidebarHidden={sidebarHidden}
            onShowSidebar={() => setSidebar(false)}
            onOpenBoard={goToBoard}
            onCreateBoard={() => openBoardModal({ mode: "create" })}
            onEditBoard={(board) => openBoardModal({ mode: "edit", board })}
            onDeleteBoard={(board) => void handleDeleteBoard(board)}
          />
        ) : (
          <KanbanBoard
            key={boardId}
            boardId={boardId}
            board={boards.find((board) => board.id === boardId)}
            sidebarHidden={sidebarHidden}
            onShowSidebar={() => setSidebar(false)}
            onGoHome={goToBoardList}
            onEditBoard={(board) => openBoardModal({ mode: "edit", board })}
            onDeleteBoard={(board) => void handleDeleteBoard(board)}
          />
        )}
      </main>

      {sidebarHidden && (
        <button
          type="button"
          className="sidebar-show"
          onClick={() => setSidebar(false)}
          title="Mostrar barra lateral"
          aria-label="Mostrar barra lateral"
        >
          <Icon name="eye" size={18} />
        </button>
      )}

      {boardModal && (
        <BoardFormModal
          board={boardModal.mode === "edit" ? boardModal.board : undefined}
          saving={boardBusy}
          error={boardModalError}
          onSave={handleSaveBoard}
          onCancel={() => setBoardModal(null)}
        />
      )}
    </div>
  );
}
