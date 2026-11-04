
import { useState, type DragEvent, type FormEvent } from "react";
import type { KanbanColumn as Column, Task } from "../types/kanban";
import TaskCard from "./TaskCard";

interface KanbanColumnProps {
  column: Column;
  onCreateTask: (
    columnId: number,
    data: {
      title: string;
      description: string;
      priority: Task["priority"];
    },
  ) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  onMoveTask: (task: Task) => void;
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
}

export default function KanbanColumn({
  column,
  onCreateTask,
  onDeleteTask,
  onMoveTask,
  onDropTask,
  onReorderTask,
  onDeleteColumn,
}: KanbanColumnProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      await onCreateTask(column.id, {
        title,
        description,
        priority,
      });

      setTitle("");
      setDescription("");
      setPriority("medium");
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  function handleDragStart(
    event: DragEvent<HTMLDivElement>,
    taskId: number,
  ) {
    event.dataTransfer.setData("text/plain", String(taskId));
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setIsDragOver(false);
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);

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
      <header className="column-header">
        <div>
          <h2>{column.name}</h2>
          <span className="task-count">
            {column.tasks.length} tarefas
          </span>
        </div>

        <button
          type="button"
          className="icon-button"
          title="Excluir coluna"
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
      </header>

      <div
        className={`task-list${isDragOver ? " task-list-drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(event) => void handleDrop(event)}
      >
        {column.tasks.map((task) => (
          <div
            key={task.id}
            className="draggable-task"
            draggable
            onDragStart={(event) => handleDragStart(event, task.id)}
          >
            <TaskCard
              task={task}
              onDelete={(id) => void onDeleteTask(id)}
              onMove={onMoveTask}
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
            <button type="submit" disabled={saving}>
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
