import type { Task } from "../types/kanban";
import Icon from "./Icon";

interface TaskCardProps {
  task: Task;
  // O cartão inteiro abre a tarefa (editar, mover de coluna ou excluir).
  onOpen: (task: Task) => void;
}

const priorityLabels: Record<Task["priority"], string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

function formatDueDate(dueDate: string) {
  // Meio-dia evita que o fuso horário mude o dia exibido.
  return new Date(`${dueDate.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "pt-BR",
    { day: "2-digit", month: "short" },
  );
}

function isOverdue(dueDate: string) {
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return dueDate.slice(0, 10) < today;
}

export default function TaskCard({ task, onOpen }: TaskCardProps) {
  const overdue = task.due_date ? isOverdue(task.due_date) : false;

  return (
    <article
      className="task-card"
      role="button"
      tabIndex={0}
      aria-label={`Abrir a tarefa ${task.title}`}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(task);
        }
      }}
    >
      <h3>{task.title}</h3>

      {task.description && (
        <p className="task-card-description">{task.description}</p>
      )}

      <div className="task-card-meta">
        <span className={`priority priority-${task.priority}`}>
          <span className="priority-dot" aria-hidden="true" />
          {priorityLabels[task.priority]}
        </span>

        {task.due_date && (
          <span
            className={`task-card-due${overdue ? " task-card-due-overdue" : ""}`}
            title={overdue ? "Vencida" : "Vencimento"}
          >
            <Icon name="calendar" size={12} />
            {formatDueDate(task.due_date)}
          </span>
        )}
      </div>
    </article>
  );
}
