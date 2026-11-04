import type { Task } from "../types/kanban";

interface TaskCardProps {
  task: Task;
  onDelete: (id: number) => void;
  onMove: (task: Task) => void;
}

const priorityLabels: Record<Task["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export default function TaskCard({ task, onDelete, onMove }: TaskCardProps) {
  return (
    <article className="task-card">
      <div className="task-card-header">
        <span className={`priority priority-${task.priority}`}>
          {priorityLabels[task.priority]}
        </span>

        <button
          type="button"
          className="icon-button"
          title="Excluir tarefa"
          onClick={() => onDelete(task.id)}
        >
          ×
        </button>
      </div>

      <h3>{task.title}</h3>

      {task.description && <p>{task.description}</p>}

      {task.due_date && (
        <small>
          Vencimento:{" "}
          {new Date(`${task.due_date}T12:00:00`).toLocaleDateString("pt-BR")}
        </small>
      )}

      <button
        type="button"
        className="move-button"
        onClick={() => onMove(task)}
      >
        Mover para outra coluna
      </button>
    </article>
  );
}
