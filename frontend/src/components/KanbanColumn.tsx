
import type { CSSProperties, DragEvent } from "react";
import type {
  KanbanColumn as Column,
  Task,
  TaskDragState,
} from "../types/kanban";
import { COLUMN_DRAG_TYPE, isColumnDrag } from "../dragTypes";
import { confirmDialog } from "../confirmDialog";
import TaskCard from "./TaskCard";
import Icon from "./Icon";

interface KanbanColumnProps {
  column: Column;
  // Cor da bolinha do cabeçalho (varia por posição da coluna).
  color: string;
  busy: boolean;
  onOpenTask: (task: Task) => void;
  onEditColumn: (column: Column) => void;
  onDropTask: (
    taskId: number,
    destinationColumnId: number,
  ) => Promise<void>;
  onReorderTask: (
    taskId: number,
    columnId: number,
    insertIndex: number,
  ) => Promise<void>;
  onDeleteColumn: (id: number) => Promise<void>;
  dragState: TaskDragState | null;
  onTaskDragStart: (taskId: number, sourceColumnId: number) => void;
  onTaskDragOver: (columnId: number, insertIndex: number) => void;
  onTaskDragLeave: (columnId: number) => void;
  onTaskDragEnd: () => void;
  isColumnDragging: boolean;
  onColumnDragStart: (columnId: number) => void;
  onColumnDragEnd: () => void;
}

export default function KanbanColumn({
  column,
  color,
  busy,
  onOpenTask,
  onEditColumn,
  onDropTask,
  onReorderTask,
  onDeleteColumn,
  dragState,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDragLeave,
  onTaskDragEnd,
  isColumnDragging,
  onColumnDragStart,
  onColumnDragEnd,
}: KanbanColumnProps) {
  const isDragOver = dragState?.overColumnId === column.id;
  const isReordering =
    isDragOver && dragState?.sourceColumnId === column.id;
  const isReceiving =
    isDragOver && dragState?.sourceColumnId !== column.id;

  // Ponto de inserção exibido ao reordenar; omitido quando soltar ali não
  // mudaria a ordem (logo acima ou logo abaixo da própria tarefa).
  const draggedIndex = isReordering
    ? column.tasks.findIndex((task) => task.id === dragState?.taskId)
    : -1;
  const insertIndex = isReordering ? dragState?.insertIndex ?? null : null;
  const dropIndicatorIndex =
    insertIndex !== null &&
    insertIndex !== draggedIndex &&
    insertIndex !== draggedIndex + 1
      ? insertIndex
      : null;

  async function handleDeleteColumn() {
    const taskCount = column.tasks.length;

    const confirmed = await confirmDialog({
      title: `Excluir a coluna "${column.name}"?`,
      text:
        taskCount > 0
          ? `Isso também apaga ${taskCount} ${taskCount === 1 ? "tarefa" : "tarefas"}. Esta ação não pode ser desfeita.`
          : "Esta ação não pode ser desfeita.",
      danger: true,
    });

    if (confirmed) {
      await onDeleteColumn(column.id);
    }
  }

  function handleDragStart(
    event: DragEvent<HTMLDivElement>,
    taskId: number,
  ) {
    event.dataTransfer.setData("text/plain", String(taskId));
    event.dataTransfer.effectAllowed = "move";

    // Adia a atualização para o navegador capturar a imagem de arraste
    // antes de o cartão receber o estilo esmaecido.
    window.setTimeout(() => onTaskDragStart(taskId, column.id), 0);
  }

  // O cabeçalho é a alça de arraste da coluna; a imagem de arraste mostra a
  // coluna inteira. A ordem é tratada pelo quadro (KanbanBoard).
  function handleColumnDragStart(event: DragEvent<HTMLElement>) {
    event.dataTransfer.setData(COLUMN_DRAG_TYPE, String(column.id));
    event.dataTransfer.effectAllowed = "move";

    const section = event.currentTarget.closest(".kanban-column");

    if (section instanceof HTMLElement) {
      const rect = section.getBoundingClientRect();
      event.dataTransfer.setDragImage(
        section,
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    }

    window.setTimeout(() => onColumnDragStart(column.id), 0);
  }

  // Arrastes de coluna são ignorados pela lista de tarefas e seguem
  // (por propagação) para a área de colunas do quadro.
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (isColumnDrag(event)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    onTaskDragOver(
      column.id,
      getInsertIndex(event.currentTarget, event.clientY),
    );
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    if (isColumnDrag(event)) return;

    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    onTaskDragLeave(column.id);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (isColumnDrag(event)) return;

    event.preventDefault();

    // O cartão de origem pode ser desmontado ao mudar de coluna, e aí o
    // dragend não dispara; por isso o estado também é limpo aqui.
    onTaskDragEnd();

    const taskId = Number(event.dataTransfer.getData("text/plain"));

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return;
    }

    const taskAlreadyHere = column.tasks.some(
      (task) => task.id === taskId,
    );

    if (taskAlreadyHere) {
      await onReorderTask(
        taskId,
        column.id,
        getInsertIndex(event.currentTarget, event.clientY),
      );
      return;
    }

    await onDropTask(taskId, column.id);
  }

  // Retorna a posição (0..n) entre os cartões onde o item foi solto,
  // comparando o cursor com o ponto médio vertical de cada cartão.
  function getInsertIndex(list: HTMLElement, clientY: number) {
    const cards = Array.from(
      list.querySelectorAll<HTMLElement>(":scope > .draggable-task"),
    );

    const index = cards.findIndex((card) => {
      const rect = card.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });

    return index === -1 ? cards.length : index;
  }

  return (
    <section
      className={`kanban-column${isColumnDragging ? " kanban-column-dragging" : ""}`}
      style={{ "--column-color": color } as CSSProperties}
    >
      <header
        className="column-header"
        draggable={!busy}
        onDragStart={handleColumnDragStart}
        onDragEnd={onColumnDragEnd}
        title="Arraste para reordenar a coluna"
      >
        <h2>
          <span className="column-dot" aria-hidden="true" />
          <span className="column-name">{column.name}</span>
          <span className="column-count">({column.tasks.length})</span>
        </h2>

        <div className="column-actions">
          <button
            type="button"
            className="icon-button"
            title="Renomear coluna"
            aria-label={`Renomear a coluna ${column.name}`}
            disabled={busy}
            onClick={() => onEditColumn(column)}
          >
            <Icon name="pencil" size={15} />
          </button>

          <button
            type="button"
            className="icon-button icon-button-danger"
            title="Excluir coluna"
            aria-label={`Excluir a coluna ${column.name}`}
            disabled={busy}
            onClick={() => void handleDeleteColumn()}
          >
            <Icon name="trash" size={15} />
          </button>
        </div>
      </header>

      <div
        className={[
          "task-list",
          isReceiving && "task-list-drag-over",
          isReordering && "task-list-reordering",
        ]
          .filter(Boolean)
          .join(" ")}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(event) => void handleDrop(event)}
      >
        {column.tasks.map((task, index) => (
          <div
            key={task.id}
            className={[
              "draggable-task",
              dragState?.taskId === task.id && "draggable-task-dragging",
              dropIndicatorIndex === index && "drop-before",
              dropIndicatorIndex === column.tasks.length &&
                index === column.tasks.length - 1 &&
                "drop-after",
            ]
              .filter(Boolean)
              .join(" ")}
            draggable={!busy}
            onDragStart={(event) => handleDragStart(event, task.id)}
            onDragEnd={onTaskDragEnd}
          >
            <TaskCard task={task} onOpen={onOpenTask} />
          </div>
        ))}

        {column.tasks.length === 0 && (
          <p className="empty-column">Arraste tarefas para cá</p>
        )}
      </div>
    </section>
  );
}
