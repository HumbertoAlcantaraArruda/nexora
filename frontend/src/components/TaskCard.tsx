import type { Task } from "../types/kanban";

interface TaskCardProps {
  task: Task;
  disabled?: boolean;
  onDelete: (id: number) => void;
  onEdit: (task: Task) => void;
}

const priorityLabels: Record<Task["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export default function TaskCard({
  task,
  disabled = false,
  onDelete,
  onEdit,
}: TaskCardProps) {
  return (
    <article className="task-card">
      <div className="task-card-header">
        <span className={`priority priority-${task.priority}`}>
          {priorityLabels[task.priority]}
        </span>

        <div className="task-card-actions">
          <button
            type="button"
            className="icon-button"
            title="Editar tarefa"
            aria-label="Editar tarefa"
            disabled={disabled}
            onClick={() => onEdit(task)}
          >
            ✎
          </button>

          <button
            type="button"
            className="icon-button"
            title="Excluir tarefa"
            aria-label="Excluir tarefa"
            disabled={disabled}
            onClick={() => onDelete(task.id)}
          >
            ×
          </button>
        </div>
      </div>

      <h3>{task.title}</h3>

      {task.description && <p>{task.description}</p>}

      {task.due_date && (
        <small>
          Vencimento:{" "}
          {new Date(`${task.due_date}T12:00:00`).toLocaleDateString("pt-BR")}
        </small>
      )}
    </article>
  );
}
