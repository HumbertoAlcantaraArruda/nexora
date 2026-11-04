import { useCallback, useEffect, useRef, useState } from "react";
import AuthForm from "./components/AuthForm";
import BoardFormModal, { type BoardFormData } from "./components/BoardFormModal";
import BoardList from "./components/BoardList";
import InvitationPage from "./components/InvitationPage";
import KanbanBoard from "./components/KanbanBoard";
import SettingsPage from "./components/SettingsPage";
import ShareBoardModal from "./components/ShareBoardModal";
import Sidebar from "./components/Sidebar";
import { confirmDialog } from "./confirmDialog";
import { SESSION_EXPIRED_EVENT } from "./services/api";
import { getApiErrorMessage } from "./services/apiErrors";
import {
  acceptInvitation,
  declineInvitation,
  getMyInvitations,
  removeMember,
  type BoardInvitation,
} from "./services/memberService";
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
import {
  getBoardIdFromHash,
  getInvitationIdFromHash,
  goToBoard,
  goToBoardList,
  goToSettings,
  isSettingsHash,
} from "./navigation";
import "./App.css";

type BoardModalState = { mode: "create" } | { mode: "edit"; board: Board } | null;

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState<number | null>(getBoardIdFromHash);
  const [settingsOpen, setSettingsOpen] = useState(isSettingsHash);
  const [invitationId, setInvitationId] = useState<number | null>(
    getInvitationIdFromHash,
  );
  // Convites recebidos e ainda não respondidos.
  const [invitations, setInvitations] = useState<BoardInvitation[]>([]);
  // A barra lateral fica sempre visível como um trilho de ícones; expandida,
  // empurra o conteúdo e recolhe ao clicar fora dela.
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Quadros do usuário: compartilhados pela barra lateral, tela inicial e
  // cabeçalho do quadro aberto.
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [boardsError, setBoardsError] = useState("");
  const [boardBusy, setBoardBusy] = useState(false);
  const [boardModal, setBoardModal] = useState<BoardModalState>(null);
  const [boardModalError, setBoardModalError] = useState("");
  const [shareBoard, setShareBoard] = useState<Board | null>(null);
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
      setSettingsOpen(isSettingsHash());
      setInvitationId(getInvitationIdFromHash());
      window.scrollTo(0, 0);
      setSidebarExpanded(false);
    }

    window.addEventListener("hashchange", handleHashChange);

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const loadBoards = useCallback(async () => {
    // Os convites vêm junto; uma falha neles não impede a lista de quadros.
    getMyInvitations()
      .then(setInvitations)
      .catch(() => {});

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

  // Barra expandida: qualquer clique fora dela (ou Esc) a recolhe. O clique
  // segue normalmente para o que estiver embaixo (cartão, botão etc.).
  useEffect(() => {
    if (!sidebarExpanded) return;

    function handlePointerDown(event: PointerEvent) {
      if (!sidebarRef.current?.contains(event.target as Node)) {
        setSidebarExpanded(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarExpanded(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [sidebarExpanded]);

  // Ações da barra lateral recolhem a barra depois de executar.
  function fromSidebar(action: () => void) {
    return () => {
      setSidebarExpanded(false);
      action();
    };
  }

  // Após o login o usuário começa na tela "Meus quadros", exceto quando veio
  // pelo link de um convite: aí o convite continua aberto.
  function handleAuthenticated(authenticatedUser: User) {
    if (getInvitationIdFromHash() === null) {
      goToBoardList();
      setBoardId(null);
    }

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
      setInvitations([]);
      boardsLoadedRef.current = false;
      setBoardsLoading(true);
      setUser(null);
    }
  }

  // ---- Convites recebidos ---------------------------------------------------

  async function handleAcceptInvitation(invitation: BoardInvitation) {
    setBoardBusy(true);
    setBoardsError("");

    try {
      await acceptInvitation(invitation.id);
      setInvitations((current) =>
        current.filter((item) => item.id !== invitation.id),
      );
      await loadBoards();

      if (invitation.board) goToBoard(invitation.board.id);
    } catch (err) {
      setBoardsError(
        getApiErrorMessage(err, "Não foi possível aceitar o convite."),
      );
      await loadBoards();
    } finally {
      setBoardBusy(false);
    }
  }

  async function handleDeclineInvitation(invitation: BoardInvitation) {
    const confirmed = await confirmDialog({
      title: `Recusar o convite para "${invitation.board?.name ?? "o quadro"}"?`,
      text: "Você não terá acesso ao quadro. Para entrar depois, será preciso um novo convite.",
      danger: true,
    });

    if (!confirmed) return;

    setBoardBusy(true);
    setBoardsError("");

    try {
      await declineInvitation(invitation.id);
      setInvitations((current) =>
        current.filter((item) => item.id !== invitation.id),
      );
      goToBoardList();
    } catch (err) {
      setBoardsError(
        getApiErrorMessage(err, "Não foi possível recusar o convite."),
      );
      await loadBoards();
    } finally {
      setBoardBusy(false);
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

  // Quem recebeu um quadro compartilhado pode deixar de vê-lo.
  async function handleLeaveBoard(board: Board) {
    if (!user) return;

    const confirmed = await confirmDialog({
      title: `Sair do quadro "${board.name}"?`,
      text: `Você deixará de ver este quadro. ${board.owner.name} pode compartilhá-lo de novo.`,
      danger: true,
    });

    if (!confirmed) return;

    setBoardBusy(true);
    setBoardsError("");

    try {
      await removeMember(board.id, user.id);
      setBoards((current) => current.filter((item) => item.id !== board.id));

      if (boardId === board.id) goToBoardList();
    } catch (err) {
      setBoardsError(getApiErrorMessage(err, "Não foi possível sair do quadro."));
      if (boardId === board.id) goToBoardList();
      await loadBoards();
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
    <div className={`app-shell${sidebarExpanded ? " sidebar-open" : ""}`}>
      <Sidebar
        ref={sidebarRef}
        boards={boards}
        activeBoardId={boardId}
        settingsActive={settingsOpen}
        invitationCount={invitations.length}
        user={user}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((current) => !current)}
        onGoHome={fromSidebar(goToBoardList)}
        onOpenBoard={(id) => {
          setSidebarExpanded(false);
          goToBoard(id);
        }}
        onCreateBoard={fromSidebar(() => openBoardModal({ mode: "create" }))}
        onOpenSettings={fromSidebar(goToSettings)}
        onLogout={fromSidebar(() => void handleLogout())}
      />

      {/* Fundo escurecido da barra expandida (só no celular). */}
      <div className="sidebar-backdrop" aria-hidden="true" />

      <main className="app-main">
        {invitationId !== null ? (
          <InvitationPage
            key={invitationId}
            invitationId={invitationId}
            busy={boardBusy}
            onAccept={handleAcceptInvitation}
            onDecline={handleDeclineInvitation}
            onGoHome={goToBoardList}
            onOpenBoard={goToBoard}
          />
        ) : settingsOpen ? (
          <SettingsPage user={user} onUserUpdated={setUser} />
        ) : boardId === null ? (
          <BoardList
            boards={boards}
            loading={boardsLoading}
            error={boardsError}
            busy={boardBusy}
            onOpenBoard={goToBoard}
            onCreateBoard={() => openBoardModal({ mode: "create" })}
            onEditBoard={(board) => openBoardModal({ mode: "edit", board })}
            onShareBoard={setShareBoard}
            onDeleteBoard={(board) => void handleDeleteBoard(board)}
            onLeaveBoard={(board) => void handleLeaveBoard(board)}
            invitations={invitations}
            onAcceptInvitation={(invitation) =>
              void handleAcceptInvitation(invitation)
            }
            onDeclineInvitation={(invitation) =>
              void handleDeclineInvitation(invitation)
            }
          />
        ) : (
          <KanbanBoard
            key={boardId}
            boardId={boardId}
            board={boards.find((board) => board.id === boardId)}
            onGoHome={goToBoardList}
            onEditBoard={(board) => openBoardModal({ mode: "edit", board })}
            onShareBoard={setShareBoard}
            onDeleteBoard={(board) => void handleDeleteBoard(board)}
            onLeaveBoard={(board) => void handleLeaveBoard(board)}
          />
        )}
      </main>

      {boardModal && (
        <BoardFormModal
          board={boardModal.mode === "edit" ? boardModal.board : undefined}
          saving={boardBusy}
          error={boardModalError}
          onSave={handleSaveBoard}
          onCancel={() => setBoardModal(null)}
        />
      )}

      {shareBoard && (
        <ShareBoardModal board={shareBoard} onClose={() => setShareBoard(null)} />
      )}
    </div>
  );
}
