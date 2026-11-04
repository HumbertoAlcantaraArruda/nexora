import { useEffect, useState, type FormEvent } from "react";
import {
  createBoard,
  deleteBoard,
  getBoards,
  type Board,
} from "../services/boardService";
import type { User } from "../services/authService";
import { logout } from "../services/authService";

interface BoardListProps {
  user: User;
  onLogout: () => void;
}

export default function BoardList({ user, onLogout }: BoardListProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadBoards() {
    try {
      setError("");
      const result = await getBoards();
      setBoards(result);
    } catch {
      setError("Não foi possível carregar os quadros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBoards();
  }, []);

  async function handleCreateBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setError("");

      const board = await createBoard({
        name,
        description: description || null,
      });

      setBoards((current) => [board, ...current]);
      setName("");
      setDescription("");
    } catch {
      setError("Não foi possível criar o quadro.");
    }
  }

  async function handleDeleteBoard(id: number) {
    if (!window.confirm("Deseja excluir este quadro?")) {
      return;
    }

    try {
      setError("");
      await deleteBoard(id);
      setBoards((current) => current.filter((board) => board.id !== id));
    } catch {
      setError("Não foi possível excluir o quadro.");
    }
  }

  async function handleLogout() {
    await logout();
    onLogout();
  }

  return (
    <main className="board-container">
      <header className="board-header">
        <div>
          <h1>Meu Kanban</h1>
          <p>Olá, {user.name}</p>
        </div>

        <button type="button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      <section className="board-create">
        <h2>Novo quadro</h2>

        <form onSubmit={handleCreateBoard}>
          <label>
            Nome do quadro
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={255}
              required
            />
          </label>

          <label>
            Descrição
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <button type="submit">Criar quadro</button>
        </form>
      </section>

      <section>
        <h2>Meus quadros</h2>

        {error && <p className="auth-error">{error}</p>}
        {loading && <p>Carregando quadros...</p>}

        {!loading && boards.length === 0 && (
          <p>Você ainda não possui quadros. Crie seu primeiro quadro acima.</p>
        )}

        <div className="board-grid">
          {boards.map((board) => (
            <article className="board-card" key={board.id}>
              <h3>{board.name}</h3>
              <p>{board.description || "Sem descrição"}</p>

              <button type="button" onClick={() => handleDeleteBoard(board.id)}>
                Excluir
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
