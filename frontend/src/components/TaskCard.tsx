import type { Task } from "../types/kanban";
import Icon from "./Icon";

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
            <Icon name="pencil" size={15} />
          </button>

          <button
            type="button"
            className="icon-button icon-button-danger"
            title="Excluir tarefa"
            aria-label="Excluir tarefa"
            disabled={disabled}
            onClick={() => onDelete(task.id)}
          >
            <Icon name="trash" size={15} />
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
