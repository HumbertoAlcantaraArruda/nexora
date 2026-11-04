
import { useEffect, useState, type FormEvent } from "react";
import type {
  KanbanBoard as Board,
  KanbanColumn as Column,
  Task,
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
  updateTask,
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

    try {
      setError("");

      const updatedTask = await updateTask(moveTask.id, {
        board_column_id: destinationId,
        position: destination.tasks.length,
      });

      setColumns((current) =>
        current.map((column) => {
          if (column.id === source.id) {
            return {
              ...column,
              tasks: column.tasks
                .filter((task) => task.id !== moveTask.id)
                .map((task, position) => ({ ...task, position })),
            };
          }

          if (column.id === destinationId) {
            return {
              ...column,
              tasks: [...column.tasks, updatedTask],
            };
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

      await updateTask(taskId, {
        board_column_id: destinationColumnId,
        position: movedTask.position,
      });

      await Promise.all([
        ...sourceTasks.map((item) =>
          updateTask(item.id, { position: item.position }),
        ),
        ...destinationTasks
          .filter((item) => item.id !== taskId)
          .map((item) => updateTask(item.id, { position: item.position })),
      ]);
    } catch {
      setError(
        "Não foi possível salvar a movimentação. Recarregue o quadro para sincronizar os dados.",
      );
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
