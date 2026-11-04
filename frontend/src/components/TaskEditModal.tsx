import { useState, type FormEvent } from "react";
import type { Task } from "../types/kanban";

export type TaskEditData = Pick<
  Task,
  "title" | "description" | "priority" | "due_date"
>;

interface TaskEditModalProps {
  task: Task;
  saving: boolean;
  error: string;
  onSave: (data: TaskEditData) => Promise<boolean>;
  onCancel: () => void;
}

const TITLE_MAX = 255;
const DESCRIPTION_MAX = 5000;

// Validação no frontend para feedback imediato; o backend valida novamente.
function validate(title: string, description: string): string {
  if (!title.trim()) return "Informe o título da tarefa.";
  if (title.trim().length > TITLE_MAX) {
    return `O título deve ter no máximo ${TITLE_MAX} caracteres.`;
  }
  if (description.trim().length > DESCRIPTION_MAX) {
    return `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.`;
  }
  return "";
}

export default function TaskEditModal({
  task,
  saving,
  error,
  onSave,
  onCancel,
}: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<Task["priority"]>(task.priority);
  const [dueDate, setDueDate] = useState(task.due_date?.slice(0, 10) ?? "");
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = validate(title, description);
    setValidationError(message);

    if (message) return;

    const saved = await onSave({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      due_date: dueDate || null,
    });

    if (saved) onCancel();
  }

  const visibleError = validationError || error;

  return (
    <div className="modal-overlay">
      <form
        className="move-modal edit-modal"
        onSubmit={handleSubmit}
        noValidate
      >
        <h2>Editar tarefa</h2>

        <label>
          Título
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setValidationError("");
            }}
            maxLength={TITLE_MAX}
            required
            autoFocus
          />
        </label>

        <label>
          Descrição
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setValidationError("");
            }}
            maxLength={DESCRIPTION_MAX}
            rows={4}
          />
        </label>

        <label>
          Prioridade
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as Task["priority"])
            }
          >
            <option value="low">Prioridade baixa</option>
            <option value="medium">Prioridade média</option>
            <option value="high">Prioridade alta</option>
          </select>
        </label>

        <label>
          Vencimento
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>

        {visibleError && (
          <p className="auth-error" role="alert">
            {visibleError}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
