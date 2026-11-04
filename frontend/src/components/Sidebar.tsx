import type { Board } from "../services/boardService";
import type { User } from "../services/authService";
import Icon from "./Icon";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  boards: Board[];
  activeBoardId: number | null;
  user: User;
  onGoHome: () => void;
  onOpenBoard: (boardId: number) => void;
  onCreateBoard: () => void;
  onHide: () => void;
  onLogout: () => void;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default function Sidebar({
  boards,
  activeBoardId,
  user,
  onGoHome,
  onOpenBoard,
  onCreateBoard,
  onHide,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Barra lateral">
      <button
        type="button"
        className="sidebar-logo"
        onClick={onGoHome}
        title="Ir para Meus quadros"
      >
        <Logo />
      </button>

      <nav className="sidebar-nav" aria-label="Quadros">
        <button
          type="button"
          className={`sidebar-item${activeBoardId === null ? " sidebar-item-active" : ""}`}
          onClick={onGoHome}
          aria-current={activeBoardId === null ? "page" : undefined}
        >
          <Icon name="grid" size={16} />
          <span>Meus quadros</span>
        </button>

        <p className="sidebar-section-title">
          Todos os quadros ({boards.length})
        </p>

        <ul className="sidebar-boards">
          {boards.map((board) => {
            const active = board.id === activeBoardId;

            return (
              <li key={board.id}>
                <button
                  type="button"
                  className={`sidebar-item${active ? " sidebar-item-active" : ""}`}
                  onClick={() => onOpenBoard(board.id)}
                  aria-current={active ? "page" : undefined}
                  title={board.name}
                >
                  <Icon name="board" size={16} />
                  <span>{board.name}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className="sidebar-item sidebar-create"
          onClick={onCreateBoard}
        >
          <Icon name="plus" size={16} />
          <span>Criar novo quadro</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <ThemeToggle />

        <div className="sidebar-user">
          <span className="avatar" aria-hidden="true">
            {initials(user.name)}
          </span>
          <span className="sidebar-user-name" title={user.email}>
            {user.name}
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={onLogout}
            title="Sair"
            aria-label="Sair"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>

        <button type="button" className="sidebar-item" onClick={onHide}>
          <Icon name="eye-off" size={16} />
          <span>Ocultar barra lateral</span>
        </button>
      </div>
    </aside>
  );
}
