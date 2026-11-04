
import { useState, type DragEvent, type FormEvent } from "react";
import type {
  KanbanColumn as Column,
  Task,
  TaskDragState,
} from "../types/kanban";
import TaskCard from "./TaskCard";

interface KanbanColumnProps {
  column: Column;
  busy: boolean;
  onCreateTask: (
    columnId: number,
    data: {
      title: string;
      description: string;
      priority: Task["priority"];
    },
  ) => Promise<boolean>;
  onDeleteTask: (id: number) => Promise<void>;
  onMoveTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onRenameColumn: (id: number, name: string) => Promise<boolean>;
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
}

export default function KanbanColumn({
  column,
  busy,
  onCreateTask,
  onDeleteTask,
  onMoveTask,
  onEditTask,
  onRenameColumn,
  onDropTask,
  onReorderTask,
  onDeleteColumn,
  dragState,
  onTaskDragStart,
  onTaskDragOver,
  onTaskDragLeave,
  onTaskDragEnd,
}: KanbanColumnProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const created = await onCreateTask(column.id, {
        title,
        description,
        priority,
      });

      // Em caso de falha mantém o formulário preenchido para nova tentativa;
      // a mensagem de erro é exibida pelo quadro.
      if (created) {
        setTitle("");
        setDescription("");
        setPriority("medium");
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function startRenaming() {
    setNameDraft(column.name);
    setNameError("");
    setEditingName(true);
  }

  function cancelRenaming() {
    setEditingName(false);
    setNameError("");
  }

  async function handleRename(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = nameDraft.trim();

    // Validação no frontend para feedback imediato; o backend valida novamente.
    if (!name) {
      setNameError("Informe o nome da coluna.");
      return;
    }

    if (name.length > 255) {
      setNameError("O nome deve ter no máximo 255 caracteres.");
      return;
    }

    if (name === column.name) {
      cancelRenaming();
      return;
    }

    // Em caso de falha mantém o campo aberto; a mensagem aparece no quadro.
    if (await onRenameColumn(column.id, name)) {
      cancelRenaming();
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

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    onTaskDragOver(
      column.id,
      getInsertIndex(event.currentTarget, event.clientY),
    );
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
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
    <section className="kanban-column">
      {editingName ? (
        <form
          className="column-rename-form"
          onSubmit={(event) => void handleRename(event)}
          noValidate
        >
          <input
            aria-label="Nome da coluna"
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") cancelRenaming();
            }}
            maxLength={255}
            autoFocus
          />

          {nameError && (
            <p className="auth-error" role="alert">
              {nameError}
            </p>
          )}

          <div className="form-actions">
            <button type="submit" disabled={busy}>
              {busy ? "Salvando..." : "Salvar"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={cancelRenaming}
              disabled={busy}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <header className="column-header">
          <div>
            <h2>{column.name}</h2>
            <span className="task-count">
              {column.tasks.length} tarefas
            </span>
          </div>

          <div className="column-actions">
            <button
              type="button"
              className="icon-button"
              title="Renomear coluna"
              aria-label="Renomear coluna"
              disabled={busy}
              onClick={startRenaming}
            >
              ✎
            </button>

            <button
              type="button"
              className="icon-button"
              title="Excluir coluna"
              aria-label="Excluir coluna"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    `Excluir a coluna "${column.name}" e suas tarefas?`,
                  )
                ) {
                  void onDeleteColumn(column.id);
                }
              }}
            >
              ×
            </button>
          </div>
        </header>
      )}

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
            <TaskCard
              task={task}
              disabled={busy}
              onDelete={(id) => void onDeleteTask(id)}
              onMove={onMoveTask}
              onEdit={onEditTask}
            />
          </div>
        ))}

        {column.tasks.length === 0 && (
          <p className="empty-column">
            Nenhuma tarefa nesta coluna
          </p>
        )}
      </div>

      {showForm ? (
        <form className="task-form" onSubmit={handleSubmit}>
          <input
            placeholder="Título da tarefa"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            required
          />

          <textarea
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />

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

          <div className="form-actions">
            <button type="submit" disabled={saving || busy}>
              {saving ? "Salvando..." : "Salvar tarefa"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => setShowForm(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="add-task-button"
          onClick={() => setShowForm(true)}
        >
          + Adicionar tarefa
        </button>
      )}
    </section>
  );
}
