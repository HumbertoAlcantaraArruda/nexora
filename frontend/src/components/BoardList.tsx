import type { Board } from "../services/boardService";
import { initials } from "../initials";
import Icon from "./Icon";
import TopBar from "./TopBar";

interface BoardListProps {
  boards: Board[];
  loading: boolean;
  error: string;
  busy: boolean;
  onOpenBoard: (boardId: number) => void;
  onCreateBoard: () => void;
  onEditBoard: (board: Board) => void;
  onDeleteBoard: (board: Board) => void;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Tela inicial após o login: os quadros do usuário em cartões.
export default function BoardList({
  boards,
  loading,
  error,
  busy,
  onOpenBoard,
  onCreateBoard,
  onEditBoard,
  onDeleteBoard,
}: BoardListProps) {
  return (
    <>
      <TopBar
        title="Meus quadros"
        subtitle="Escolha um quadro para organizar colunas e tarefas."
        actions={
          <button
            type="button"
            className="button button-primary"
            onClick={onCreateBoard}
            disabled={busy}
          >
            <Icon name="plus" size={16} />
            <span className="hide-on-mobile">Novo quadro</span>
          </button>
        }
      />

      <div className="page-content">
        {error && (
          <p className="alert alert-error" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="muted">Carregando quadros...</p>
        ) : boards.length === 0 ? (
          <div className="empty-state">
            <Icon name="board" size={40} />
            <h2>Você ainda não tem quadros</h2>
            <p>Crie seu primeiro quadro para começar a organizar tarefas.</p>
            <button
              type="button"
              className="button button-primary"
              onClick={onCreateBoard}
            >
              <Icon name="plus" size={16} />
              Criar quadro
            </button>
          </div>
        ) : (
          <div className="board-grid">
            {boards.map((board) => (
              <article className="board-card" key={board.id}>
                <div className="board-card-icon" aria-hidden="true">
                  {initials(board.name) || "?"}
                </div>

                <h2>{board.name}</h2>
                <p className="board-card-description">
                  {board.description || "Sem descrição"}
                </p>

                <span className="board-card-stats">
                  {plural(board.columns_count ?? 0, "coluna", "colunas")} ·{" "}
                  {plural(board.tasks_count ?? 0, "tarefa", "tarefas")}
                </span>

                <div className="board-card-footer">
                  <div className="board-card-actions">
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => onEditBoard(board)}
                      disabled={busy}
                      title="Editar quadro"
                      aria-label={`Editar o quadro ${board.name}`}
                    >
                      <Icon name="pencil" size={16} />
                    </button>

                    <button
                      type="button"
                      className="icon-button icon-button-danger"
                      onClick={() => onDeleteBoard(board)}
                      disabled={busy}
                      title="Excluir quadro"
                      aria-label={`Excluir o quadro ${board.name}`}
                    >
                      <Icon name="trash" size={16} />
                    </button>

                    <button
                      type="button"
                      className="icon-button icon-button-primary"
                      onClick={() => onOpenBoard(board.id)}
                      disabled={busy}
                      title="Abrir quadro"
                      aria-label={`Abrir o quadro ${board.name}`}
                    >
                      <Icon name="arrow-right" size={18} />
                    </button>
                  </div>
                </div>
              </article>
            ))}

            <button
              type="button"
              className="board-card board-card-new"
              onClick={onCreateBoard}
              disabled={busy}
            >
              <Icon name="plus" size={20} />
              Novo quadro
            </button>
          </div>
        )}
      </div>
    </>
  );
}
