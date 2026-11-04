import { useEffect, useState, type FormEvent } from "react";
import {
  createBoard,
  deleteBoard,
  getBoards,
  type Board,
} from "../services/boardService";
import { getApiErrorMessage } from "../services/apiErrors";
import { confirmDialog } from "../confirmDialog";

interface BoardListProps {
  onOpenBoard: (boardId: number) => void;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export default function BoardList({ onOpenBoard }: BoardListProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadBoards() {
      try {
        setBoards(await getBoards());
      } catch (err) {
        setError(getApiErrorMessage(err, "Não foi possível carregar os quadros."));
      } finally {
        setLoading(false);
      }
    }

    void loadBoards();
  }, []);

  async function handleCreateBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    // Validação no frontend para feedback imediato; o backend valida novamente.
    if (!trimmedName) {
      setError("Informe o nome do quadro.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const board = await createBoard({
        name: trimmedName,
        description: description.trim() || null,
      });

      setBoards((current) => [
        { ...board, columns_count: 0, tasks_count: 0 },
        ...current,
      ]);
      setName("");
      setDescription("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível criar o quadro."));
    } finally {
      setSaving(false);
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

    setSaving(true);
    setError("");

    try {
      await deleteBoard(board.id);
      setBoards((current) => current.filter((item) => item.id !== board.id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Não foi possível excluir o quadro."));

      // Mantém a lista fiel ao servidor (ex.: quadro já excluído em outra aba).
      try {
        setBoards(await getBoards());
      } catch {
        // A mensagem de erro já está visível.
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="board-container">
      <header className="board-header">
        <div>
          <h1>Meus quadros</h1>
          <p className="board-subtitle">
            Escolha um quadro para organizar colunas e tarefas.
          </p>
        </div>
      </header>

      <section className="board-create">
        <h2>Novo quadro</h2>

        <form onSubmit={handleCreateBoard} noValidate>
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

          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Criar quadro"}
          </button>
        </form>
      </section>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <section>
        {loading && <p>Carregando quadros...</p>}

        {!loading && boards.length === 0 && (
          <p>Você ainda não possui quadros. Crie seu primeiro quadro acima.</p>
        )}

        <div className="board-grid">
          {boards.map((board) => (
            <article className="board-card" key={board.id}>
              <h3>{board.name}</h3>
              <p>{board.description || "Sem descrição"}</p>

              <small className="board-card-stats">
                {plural(board.columns_count ?? 0, "coluna", "colunas")} ·{" "}
                {plural(board.tasks_count ?? 0, "tarefa", "tarefas")}
              </small>

              <div className="form-actions board-card-actions">
                <button
                  type="button"
                  onClick={() => onOpenBoard(board.id)}
                  disabled={saving}
                >
                  Abrir quadro
                </button>

                <button
                  type="button"
                  className="secondary-button danger-button"
                  onClick={() => void handleDeleteBoard(board)}
                  disabled={saving}
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
