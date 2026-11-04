import { useState, type FormEvent } from "react";
import type { KanbanColumn as Column, Task } from "../types/kanban";
import { confirmDialog } from "../confirmDialog";
import Modal from "./Modal";

export type TaskFormData = Pick<
  Task,
  "title" | "description" | "priority" | "due_date"
>;

interface TaskFormModalProps {
  // Sem tarefa: criação; com tarefa: edição (campos preenchidos).
  task?: Task;
  columns: Column[];
  // Coluna pré-selecionada na criação.
  defaultColumnId?: number;
  saving: boolean;
  error: string;
  // Resolve true quando a API confirma; o pai então fecha o modal.
  onSave: (data: TaskFormData, columnId: number) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onCancel: () => void;
}

const TITLE_MAX = 255;
const DESCRIPTION_MAX = 5000;

// Validação no frontend para feedback imediato; o backend valida novamente.
function validate(title: string, description: string): string {
  if (!title) return "Informe o título da tarefa.";
  if (title.length > TITLE_MAX) {
    return `O título deve ter no máximo ${TITLE_MAX} caracteres.`;
  }
  if (description.length > DESCRIPTION_MAX) {
    return `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.`;
  }
  return "";
}

export default function TaskFormModal({
  task,
  columns,
  defaultColumnId,
  saving,
  error,
  onSave,
  onDelete,
  onCancel,
}: TaskFormModalProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState<Task["priority"]>(
    task?.priority ?? "medium",
  );
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) ?? "");
  const [columnId, setColumnId] = useState(
    task?.board_column_id ?? defaultColumnId ?? columns[0]?.id ?? 0,
  );
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const message = validate(trimmedTitle, trimmedDescription);

    setValidationError(message);

    if (message) return;

    await onSave(
      {
        title: trimmedTitle,
        description: trimmedDescription || null,
        priority,
        due_date: dueDate || null,
      },
      columnId,
    );
  }

  async function handleDelete() {
    if (!task || !onDelete) return;

    const confirmed = await confirmDialog({
      title: `Excluir a tarefa "${task.title}"?`,
      text: "Esta ação não pode ser desfeita.",
      danger: true,
    });

    if (confirmed) await onDelete();
  }

  const visibleError = validationError || error;

  return (
    <Modal
      title={task ? "Editar tarefa" : "Nova tarefa"}
      onClose={onCancel}
      closeDisabled={saving}
    >
      <form
        className="modal-form"
        onSubmit={(event) => void handleSubmit(event)}
        noValidate
      >
        <label className="form-field">
          Título
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setValidationError("");
            }}
            placeholder="Ex.: Revisar layout da página inicial"
            maxLength={TITLE_MAX}
            required
            autoFocus
          />
        </label>

        <label className="form-field">
          Descrição
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setValidationError("");
            }}
            placeholder="Opcional"
            maxLength={DESCRIPTION_MAX}
            rows={4}
          />
        </label>

        <div className="form-row">
          <label className="form-field">
            Prioridade
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as Task["priority"])
              }
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </label>

          <label className="form-field">
            Vencimento
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
        </div>

        <label className="form-field">
          Status
          <select
            value={columnId}
            onChange={(event) => setColumnId(Number(event.target.value))}
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </label>

        {visibleError && (
          <p className="form-error" role="alert">
            {visibleError}
          </p>
        )}

        <div className="modal-actions">
          {task && onDelete && (
            <button
              type="button"
              className="button button-danger-ghost"
              onClick={() => void handleDelete()}
              disabled={saving}
            >
              Excluir tarefa
            </button>
          )}

          <button
            type="submit"
            className="button button-primary"
            disabled={saving}
          >
            {saving
              ? "Salvando..."
              : task
                ? "Salvar alterações"
                : "Criar tarefa"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
