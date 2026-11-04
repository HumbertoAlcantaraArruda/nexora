import type { Task } from "../types/kanban";
import Avatar from "./Avatar";
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

// Quantas das 3 barras do ícone ficam cheias: reforça a prioridade além da cor.
const priorityLevels: Record<Task["priority"], number> = {
  low: 1,
  medium: 2,
  high: 3,
};

function PriorityBars({ level }: { level: number }) {
  return (
    <svg
      className="priority-bars"
      viewBox="0 0 12 12"
      width="12"
      height="12"
      aria-hidden="true"
    >
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={index * 4.5}
          y={8 - index * 3.5}
          width="3"
          height={4 + index * 3.5}
          rx="1"
          fill="currentColor"
          opacity={index < level ? 1 : 0.3}
        />
      ))}
    </svg>
  );
}

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
      className={`task-card task-card-${task.priority}`}
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
        <span
          className={`priority priority-${task.priority}`}
          title={`Prioridade ${priorityLabels[task.priority].toLowerCase()}`}
        >
          <PriorityBars level={priorityLevels[task.priority]} />
          <span className="visually-hidden">Prioridade </span>
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

      {task.assignee && (
        <div
          className="task-card-assignee"
          title={`Responsável: ${task.assignee.name} (${task.assignee.email})`}
        >
          <Avatar user={task.assignee} size={22} />
          <span className="visually-hidden">Responsável: </span>
          <span className="task-card-assignee-name">{task.assignee.name}</span>
        </div>
      )}
    </article>
  );
}
