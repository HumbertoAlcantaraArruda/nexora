
import { useEffect, useState, type FormEvent } from "react";
import type {
  KanbanBoard as Board,
  KanbanColumn as Column,
  Task,
  TaskDragState,
} from "../types/kanban";

import { getBoards } from "../services/boardService";

import {
  createColumn,
  deleteColumn,
  getColumns,
} from "../services/columnService";

import {
  createTask,
  deleteTask,
  getTasks,
  reorderTasks,
} from "../services/taskService";

import KanbanColumn from "./KanbanColumn";

export default function KanbanBoard() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [columnName, setColumnName] = useState("");
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [moveTask, setMoveTask] = useState<Task | null>(null);
  const [targetColumnId, setTargetColumnId] = useState("");
  const [dragState, setDragState] = useState<TaskDragState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadBoards() {
      try {
        const result = await getBoards();

        setBoards(result);

        if (result.length > 0) {
          setSelectedBoardId(result[0].id);
        }
      } catch {
        setError("Não foi possível carregar os quadros.");
      } finally {
        setLoading(false);
      }
    }

    void loadBoards();
  }, []);

  useEffect(() => {
    if (selectedBoardId === null) {
      setColumns([]);
      return;
    }

    async function loadBoardContent() {
      try {
        setError("");

        const [allColumns, allTasks] = await Promise.all([
          getColumns(),
          getTasks(),
        ]);

        setColumns(
          allColumns
            .filter((column) => column.board_id === selectedBoardId)
            .map((column) => ({
              ...column,
              tasks: allTasks
                .filter((task) => task.board_column_id === column.id)
                .sort((a, b) => a.position - b.position),
            }))
            .sort((a, b) => a.position - b.position),
        );
      } catch {
        setError("Não foi possível carregar as colunas e tarefas.");
      }
    }

    void loadBoardContent();
  }, [selectedBoardId]);

  async function handleCreateColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedBoardId === null) return;

    try {
      setError("");

      const column = await createColumn({
        board_id: selectedBoardId,
        name: columnName,
        position: columns.length,
      });

      setColumns((current) => [
        ...current,
        { ...column, tasks: [] },
      ]);

      setColumnName("");
      setShowColumnForm(false);
    } catch {
      setError("Não foi possível criar a coluna.");
    }
  }

  async function handleCreateTask(
    columnId: number,
    data: {
      title: string;
      description: string;
      priority: Task["priority"];
    },
  ) {
    const task = await createTask({
      board_column_id: columnId,
      title: data.title,
      description: data.description || null,
      priority: data.priority,
      position:
        columns.find((column) => column.id === columnId)?.tasks.length ?? 0,
    });

    setColumns((current) =>
      current.map((column) =>
        column.id === columnId
          ? { ...column, tasks: [...column.tasks, task] }
          : column,
      ),
    );
  }

  async function handleDeleteTask(taskId: number) {
    try {
      setError("");

      await deleteTask(taskId);

      setColumns((current) =>
        current.map((column) => ({
          ...column,
          tasks: column.tasks
            .filter((task) => task.id !== taskId)
            .map((task, position) => ({ ...task, position })),
        })),
      );
    } catch {
      setError("Não foi possível excluir a tarefa.");
    }
  }

  async function handleDeleteColumn(columnId: number) {
    try {
      setError("");

      await deleteColumn(columnId);

      setColumns((current) =>
        current.filter((column) => column.id !== columnId),
      );
    } catch {
      setError("Não foi possível excluir a coluna.");
    }
  }

  async function handleMoveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!moveTask || !targetColumnId) return;

    const destinationId = Number(targetColumnId);
    const destination = columns.find(
      (column) => column.id === destinationId,
    );

    const source = columns.find((column) =>
      column.tasks.some((task) => task.id === moveTask.id),
    );

    if (!destination || !source) return;

    const sourceTasks = source.tasks
      .filter((task) => task.id !== moveTask.id)
      .map((task, position) => ({ ...task, position }));

    const destinationTasks = [
      ...destination.tasks,
      { ...moveTask, board_column_id: destinationId },
    ].map((task, position) => ({ ...task, position }));

    try {
      setError("");

      await reorderTasks([
        { id: source.id, task_ids: sourceTasks.map((task) => task.id) },
        {
          id: destinationId,
          task_ids: destinationTasks.map((task) => task.id),
        },
      ]);

      setColumns((current) =>
        current.map((column) => {
          if (column.id === source.id) {
            return { ...column, tasks: sourceTasks };
          }

          if (column.id === destinationId) {
            return { ...column, tasks: destinationTasks };
          }

          return column;
        }),
      );

      setMoveTask(null);
      setTargetColumnId("");
    } catch {
      setError("Não foi possível mover a tarefa.");
    }
  }

  async function handleDropTask(
    taskId: number,
    destinationColumnId: number,
  ) {
    const sourceColumn = columns.find((column) =>
      column.tasks.some((task) => task.id === taskId),
    );

    const destinationColumn = columns.find(
      (column) => column.id === destinationColumnId,
    );

    if (
      !sourceColumn ||
      !destinationColumn ||
      sourceColumn.id === destinationColumnId
    ) {
      return;
    }

    const task = sourceColumn.tasks.find((item) => item.id === taskId);

    if (!task) return;

    const sourceTasks = sourceColumn.tasks
      .filter((item) => item.id !== taskId)
      .map((item, position) => ({ ...item, position }));

    const movedTask: Task = {
      ...task,
      board_column_id: destinationColumnId,
      position: destinationColumn.tasks.length,
    };

    const destinationTasks = [
      ...destinationColumn.tasks,
      movedTask,
    ].map((item, position) => ({ ...item, position }));

    // Atualiza a interface imediatamente.
    setColumns((current) =>
      current.map((column) => {
        if (column.id === sourceColumn.id) {
          return { ...column, tasks: sourceTasks };
        }

        if (column.id === destinationColumnId) {
          return { ...column, tasks: destinationTasks };
        }

        return column;
      }),
    );

    try {
      setError("");

      await reorderTasks([
        {
          id: sourceColumn.id,
          task_ids: sourceTasks.map((item) => item.id),
        },
        {
          id: destinationColumnId,
          task_ids: destinationTasks.map((item) => item.id),
        },
      ]);
    } catch {
      setError(
        "Não foi possível salvar a movimentação. Recarregue o quadro para sincronizar os dados.",
      );
    }
  }

  function handleTaskDragStart(taskId: number, sourceColumnId: number) {
    setDragState({
      taskId,
      sourceColumnId,
      overColumnId: null,
      insertIndex: null,
    });
  }

  function handleTaskDragOver(columnId: number, insertIndex: number) {
    // dragover dispara continuamente; só atualiza quando algo muda.
    setDragState((current) =>
      current &&
      (current.overColumnId !== columnId ||
        current.insertIndex !== insertIndex)
        ? { ...current, overColumnId: columnId, insertIndex }
        : current,
    );
  }

  function handleTaskDragLeave(columnId: number) {
    setDragState((current) =>
      current && current.overColumnId === columnId
        ? { ...current, overColumnId: null, insertIndex: null }
        : current,
    );
  }

  function handleTaskDragEnd() {
    setDragState(null);
  }

  async function handleReorderTask(
    taskId: number,
    columnId: number,
    insertIndex: number,
  ) {
    const column = columns.find((item) => item.id === columnId);

    if (!column) return;

    const fromIndex = column.tasks.findIndex((task) => task.id === taskId);

    if (fromIndex === -1) return;

    // insertIndex é a posição entre os cartões atuais (0..n); ao remover a
    // tarefa da posição de origem, os índices posteriores recuam uma casa.
    const toIndex = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;

    if (toIndex === fromIndex) return;

    const previousTasks = column.tasks;
    const reordered = [...previousTasks];
    const [movedTask] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedTask);

    const reorderedTasks = reordered.map((task, position) => ({
      ...task,
      position,
    }));

    // Atualiza a interface imediatamente.
    setColumns((current) =>
      current.map((item) =>
        item.id === columnId ? { ...item, tasks: reorderedTasks } : item,
      ),
    );

    try {
      setError("");

      await reorderTasks([
        { id: columnId, task_ids: reorderedTasks.map((task) => task.id) },
      ]);
    } catch {
      setColumns((current) =>
        current.map((item) =>
          item.id === columnId ? { ...item, tasks: previousTasks } : item,
        ),
      );

      setError("Não foi possível salvar a nova ordem das tarefas.");
    }
  }

  if (loading) {
    return <p className="loading-screen">Carregando quadros...</p>;
  }

  return (
    <main className="kanban-page">
      <header className="kanban-page-header">
        <div>
          <h1>Meu Kanban</h1>
          <p>Organize suas tarefas em um só lugar</p>
        </div>

        {boards.length > 0 && (
          <label className="board-selector">
            Quadro
            <select
              value={selectedBoardId ?? ""}
              onChange={(event) =>
                setSelectedBoardId(Number(event.target.value))
              }
            >
              {boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>

      {error && <p className="auth-error">{error}</p>}

      {boards.length === 0 ? (
        <p>Você ainda não tem quadros. Crie um quadro para começar.</p>
      ) : (
        <>
          <div className="kanban-toolbar">
            <h2>
              {boards.find((board) => board.id === selectedBoardId)?.name}
            </h2>

            <button
              type="button"
              onClick={() => setShowColumnForm((current) => !current)}
            >
              + Nova coluna
            </button>
          </div>

          {showColumnForm && (
            <form
              className="new-column-form"
              onSubmit={handleCreateColumn}
            >
              <input
                placeholder="Nome da coluna"
                value={columnName}
                onChange={(event) => setColumnName(event.target.value)}
                maxLength={255}
                required
              />

              <button type="submit">Criar coluna</button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowColumnForm(false)}
              >
                Cancelar
              </button>
            </form>
          )}

          <div className="kanban-columns">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onCreateTask={handleCreateTask}
                onDeleteTask={handleDeleteTask}
                onMoveTask={setMoveTask}
                onDropTask={handleDropTask}
                onReorderTask={handleReorderTask}
                dragState={dragState}
                onTaskDragStart={handleTaskDragStart}
                onTaskDragOver={handleTaskDragOver}
                onTaskDragLeave={handleTaskDragLeave}
                onTaskDragEnd={handleTaskDragEnd}
                onDeleteColumn={handleDeleteColumn}
              />
            ))}

            {columns.length === 0 && (
              <p>
                Este quadro ainda não possui colunas. Crie a primeira acima.
              </p>
            )}
          </div>
        </>
      )}

      {moveTask && (
        <div className="modal-overlay">
          <form className="move-modal" onSubmit={handleMoveTask}>
            <h2>Mover tarefa</h2>
            <p>{moveTask.title}</p>

            <label>
              Coluna de destino
              <select
                value={targetColumnId}
                onChange={(event) => setTargetColumnId(event.target.value)}
                required
              >
                <option value="">Selecione uma coluna</option>

                {columns
                  .filter(
                    (column) => column.id !== moveTask.board_column_id,
                  )
                  .map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.name}
                    </option>
                  ))}
              </select>
            </label>

            <div className="form-actions">
              <button type="submit" disabled={!targetColumnId}>
                Mover
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => setMoveTask(null)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
