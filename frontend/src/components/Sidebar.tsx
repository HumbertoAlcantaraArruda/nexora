import { forwardRef, type MouseEvent } from "react";
import type { Board } from "../services/boardService";
import type { User } from "../services/authService";
import { initials } from "../initials";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  boards: Board[];
  activeBoardId: number | null;
  settingsActive: boolean;
  // Convites pendentes: aparecem como um número ao lado de "Meus quadros".
  invitationCount: number;
  user: User;
  expanded: boolean;
  onToggle: () => void;
  onGoHome: () => void;
  onOpenBoard: (boardId: number) => void;
  onCreateBoard: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

// Barra lateral sempre visível: recolhida é um trilho só com ícones;
// expandida mostra os nomes e empurra o conteúdo.
const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  {
    boards,
    activeBoardId,
    settingsActive,
    invitationCount,
    user,
    expanded,
    onToggle,
    onGoHome,
    onOpenBoard,
    onCreateBoard,
    onOpenSettings,
    onLogout,
  },
  ref,
) {
  const homeActive = activeBoardId === null && !settingsActive;
  const ownBoards = boards.filter((board) => board.permission === "owner");
  const sharedBoards = boards.filter((board) => board.permission !== "owner");

  function renderBoardItem(board: Board) {
    const active = board.id === activeBoardId;
    const shared = board.permission !== "owner";

    return (
      <li key={board.id}>
        <button
          type="button"
          className={`sidebar-item${active ? " sidebar-item-active" : ""}`}
          onClick={() => onOpenBoard(board.id)}
          aria-current={active ? "page" : undefined}
          title={shared ? `${board.name} (de ${board.owner.name})` : board.name}
        >
          <span className="sidebar-item-icon">
            <span className="board-badge" aria-hidden="true">
              {initials(board.name) || "?"}
            </span>
          </span>
          <span className="sidebar-item-label">{board.name}</span>
          {shared && (
            <span className="sidebar-item-owner" aria-hidden="true">
              <Avatar user={board.owner} size={20} />
            </span>
          )}
        </button>
      </li>
    );
  }
  // Recolhida, um clique na barra fora dos botões também a expande.
  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!expanded && !(event.target as Element).closest("button, a")) {
      onToggle();
    }
  }

  return (
    <aside
      ref={ref}
      id="sidebar"
      className={`sidebar${expanded ? " sidebar-expanded" : ""}`}
      aria-label="Barra lateral"
      onClick={handleClick}
    >
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls="sidebar"
          title={expanded ? "Recolher menu" : "Expandir menu"}
          aria-label={expanded ? "Recolher menu" : "Expandir menu"}
        >
          <Icon name="sidebar" size={20} />
        </button>

        <button
          type="button"
          className="sidebar-logo"
          onClick={onGoHome}
          title="Ir para Meus quadros"
          tabIndex={expanded ? 0 : -1}
        >
          <Logo />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Quadros">
        <button
          type="button"
          className={`sidebar-item${homeActive ? " sidebar-item-active" : ""}`}
          onClick={onGoHome}
          aria-current={homeActive ? "page" : undefined}
          title="Meus quadros"
        >
          <span className="sidebar-item-icon">
            <Icon name="grid" size={18} />
            {invitationCount > 0 && (
              <span
                className="sidebar-badge"
                aria-label={`${invitationCount} ${invitationCount === 1 ? "convite pendente" : "convites pendentes"}`}
              >
                {invitationCount}
              </span>
            )}
          </span>
          <span className="sidebar-item-label">Meus quadros</span>
        </button>

        <p className="sidebar-section-title">
          <span>Seus quadros ({ownBoards.length})</span>
        </p>

        <ul className="sidebar-boards">{ownBoards.map(renderBoardItem)}</ul>

        <button
          type="button"
          className="sidebar-item sidebar-create"
          onClick={onCreateBoard}
          title="Criar novo quadro"
        >
          <span className="sidebar-item-icon">
            <Icon name="plus" size={18} />
          </span>
          <span className="sidebar-item-label">Criar novo quadro</span>
        </button>

        {sharedBoards.length > 0 && (
          <>
            <p className="sidebar-section-title">
              <span>Compartilhados comigo ({sharedBoards.length})</span>
            </p>

            <ul className="sidebar-boards">
              {sharedBoards.map(renderBoardItem)}
            </ul>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle />

        <button
          type="button"
          className={`sidebar-user${settingsActive ? " sidebar-user-active" : ""}`}
          onClick={onOpenSettings}
          aria-current={settingsActive ? "page" : undefined}
          title="Configurações da conta"
        >
          <span className="sidebar-item-icon">
            <Avatar user={user} />
          </span>
          <span className="sidebar-user-text">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-email">{user.email}</span>
          </span>
        </button>

        <button
          type="button"
          className="sidebar-item"
          onClick={onLogout}
          title="Sair"
        >
          <span className="sidebar-item-icon">
            <Icon name="logout" size={18} />
          </span>
          <span className="sidebar-item-label">Sair</span>
        </button>
      </div>
    </aside>
  );
});

export default Sidebar;
