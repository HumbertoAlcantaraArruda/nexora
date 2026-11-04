
import { useEffect, useRef, useState, type FormEvent } from "react";
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
  updateColumn,
} from "../services/columnService";

import {
  createTask,
  deleteTask,
  getTasks,
  reorderTasks,
  updateTask,
} from "../services/taskService";

import {
  getApiErrorMessage,
  isSessionExpiredError,
} from "../services/apiErrors";

import KanbanColumn from "./KanbanColumn";
import TaskEditModal, { type TaskEditData } from "./TaskEditModal";

// Busca colunas e tarefas do quadro, ordenadas por position.
async function fetchBoardColumns(boardId: number): Promise<Column[]> {
  const [allColumns, allTasks] = await Promise.all([
    getColumns(),
    getTasks(),
  ]);

  return allColumns
    .filter((column) => column.board_id === boardId)
    .map((column) => ({
      ...column,
      tasks: allTasks
        .filter((task) => task.board_column_id === column.id)
        .sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.position - b.position);
}

export default function KanbanBoard() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [columnName, setColumnName] = useState("");
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [dragState, setDragState] = useState<TaskDragState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Enquanto uma alteração é salva, outras ficam bloqueadas: evita requisições
  // concorrentes sobre as mesmas tarefas e permite desfazer com segurança.
  // O ref garante o bloqueio imediato; o state atualiza a interface.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    async function loadBoards() {
      try {
        const result = await getBoards();

        setBoards(result);

        if (result.length > 0) {
          setSelectedBoardId(result[0].id);
        }
      } catch (err) {
        setError(getApiErrorMessage(err, "Não foi possível carregar os quadros."));
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

    async function loadBoardContent(boardId: number) {
      try {
        setError("");
        setColumns(await fetchBoardColumns(boardId));
      } catch (err) {
        setError(
          getApiErrorMessage(err, "Não foi possível carregar as colunas e tarefas."),
        );
      }
    }

    void loadBoardContent(selectedBoardId);
  }, [selectedBoardId]);

  // Recarrega o quadro do servidor para que a tela reflita o que foi persistido.
  async function resyncBoard() {
    if (selectedBoardId === null) return;

    try {
      setColumns(await fetchBoardColumns(selectedBoardId));
    } catch {
      setError((current) =>
        `${current} Não foi possível recarregar o quadro; recarregue a página.`.trim(),
      );
    }
  }

  // Executa uma alteração na API com bloqueio, rollback e ressincronização.
  // Retorna true somente após a API confirmar a operação.
  async function runMutation(
    fallbackMessage: string,
    action: () => Promise<void>,
    rollback?: () => void,
  ): Promise<boolean> {
    if (savingRef.current) return false;

    savingRef.current = true;
    setSaving(true);
    setError("");

    try {
      await action();
      return true;
    } catch (err) {
      rollback?.();
      setError(getApiErrorMessage(err, fallbackMessage));

      // Com a sessão expirada a aplicação volta ao login; não há o que recarregar.
      if (!isSessionExpiredError(err)) {
        await resyncBoard();
      }

      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleCreateColumn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (selectedBoardId === null) return;

    const created = await runMutation(
      "Não foi possível criar a coluna.",
      async () => {
        const column = await createColumn({
          board_id: selectedBoardId,
          name: columnName,
          position: columns.length,
        });

        setColumns((current) => [...current, { ...column, tasks: [] }]);
      },
    );

    if (created) {
      setColumnName("");
      setShowColumnForm(false);
    }
  }

  async function handleCreateTask(
    columnId: number,
    data: {
      title: string;
      description: string;
      priority: Task["priority"];
    },
  ): Promise<boolean> {
    return runMutation("Não foi possível criar a tarefa.", async () => {
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
    });
  }

  async function handleDeleteTask(taskId: number) {
    await runMutation("Não foi possível excluir a tarefa.", async () => {
      await deleteTask(taskId);

      setColumns((current) =>
        current.map((column) => ({
          ...column,
          tasks: column.tasks
            .filter((task) => task.id !== taskId)
            .map((task, position) => ({ ...task, position })),
        })),
      );
    });
  }

  function handleOpenEditTask(task: Task) {
    setError("");
    setEditingTask(task);
  }

  async function handleEditTask(
    taskId: number,
    data: TaskEditData,
  ): Promise<boolean> {
    return runMutation("Não foi possível salvar a tarefa.", async () => {
      const updated = await updateTask(taskId, data);

      setColumns((current) =>
        current.map((column) => ({
          ...column,
          tasks: column.tasks.map((task) =>
            task.id === taskId ? { ...task, ...updated } : task,
          ),
        })),
      );
    });
  }

  async function handleRenameColumn(
    columnId: number,
    name: string,
  ): Promise<boolean> {
    return runMutation("Não foi possível renomear a coluna.", async () => {
      const updated = await updateColumn(columnId, { name });

      setColumns((current) =>
        current.map((column) =>
          column.id === columnId ? { ...column, name: updated.name } : column,
        ),
      );
    });
  }

  async function handleDeleteColumn(columnId: number) {
    await runMutation("Não foi possível excluir a coluna.", async () => {
      await deleteColumn(columnId);

      setColumns((current) =>
        current.filter((column) => column.id !== columnId),
      );
    });
  }

  // Monta o novo estado de origem e destino ao levar uma tarefa para o fim
  // de outra coluna, com posições sequenciais a partir de zero.
  function buildCrossColumnMove(taskId: number, destinationId: number) {
    const source = columns.find((column) =>
      column.tasks.some((task) => task.id === taskId),
    );
    const destination = columns.find((column) => column.id === destinationId);
    const task = source?.tasks.find((item) => item.id === taskId);

    if (!source || !destination || !task || source.id === destinationId) {
      return null;
    }

    const sourceTasks = source.tasks
      .filter((item) => item.id !== taskId)
      .map((item, position) => ({ ...item, position }));

    const destinationTasks = [
      ...destination.tasks,
      { ...task, board_column_id: destinationId },
    ].map((item, position) => ({ ...item, position }));

    return { source, destination, sourceTasks, destinationTasks };
  }

  async function saveCrossColumnMove(
    taskId: number,
    destinationId: number,
    fallbackMessage: string,
  ): Promise<boolean> {
    const move = buildCrossColumnMove(taskId, destinationId);

    if (!move) return false;

    const snapshot = columns;

    return runMutation(
      fallbackMessage,
      async () => {
        // Atualiza a interface imediatamente; desfeito em caso de falha.
        setColumns((current) =>
          current.map((column) => {
            if (column.id === move.source.id) {
              return { ...column, tasks: move.sourceTasks };
            }

            if (column.id === destinationId) {
              return { ...column, tasks: move.destinationTasks };
            }

            return column;
          }),
        );

        await reorderTasks([
          {
            id: move.source.id,
            task_ids: move.sourceTasks.map((item) => item.id),
          },
          {
            id: destinationId,
            task_ids: move.destinationTasks.map((item) => item.id),
          },
        ]);
      },
      () => setColumns(snapshot),
    );
  }

  async function handleDropTask(taskId: number, destinationColumnId: number) {
    await saveCrossColumnMove(
      taskId,
      destinationColumnId,
      "Não foi possível salvar a movimentação.",
    );
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

    const reordered = [...column.tasks];
    const [movedTask] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, movedTask);

    const reorderedTasks = reordered.map((task, position) => ({
      ...task,
      position,
    }));

    const snapshot = columns;

    await runMutation(
      "Não foi possível salvar a nova ordem das tarefas.",
      async () => {
        // Atualiza a interface imediatamente; desfeito em caso de falha.
        setColumns((current) =>
          current.map((item) =>
            item.id === columnId ? { ...item, tasks: reorderedTasks } : item,
          ),
        );

        await reorderTasks([
          { id: columnId, task_ids: reorderedTasks.map((task) => task.id) },
        ]);
      },
      () => setColumns(snapshot),
    );
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
              disabled={saving}
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

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {boards.length === 0 ? (
        <p>Você ainda não tem quadros. Crie um quadro para começar.</p>
      ) : (
        <>
          <div className="kanban-toolbar">
            <h2>
              {boards.find((board) => board.id === selectedBoardId)?.name}
            </h2>

            {saving && (
              <span className="saving-indicator" role="status">
                Salvando...
              </span>
            )}

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

              <button type="submit" disabled={saving}>
                Criar coluna
              </button>

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
                busy={saving}
                onCreateTask={handleCreateTask}
                onDeleteTask={handleDeleteTask}
                onEditTask={handleOpenEditTask}
                onRenameColumn={handleRenameColumn}
                onDropTask={handleDropTask}
                onReorderTask={handleReorderTask}
                onDeleteColumn={handleDeleteColumn}
                dragState={dragState}
                onTaskDragStart={handleTaskDragStart}
                onTaskDragOver={handleTaskDragOver}
                onTaskDragLeave={handleTaskDragLeave}
                onTaskDragEnd={handleTaskDragEnd}
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

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          saving={saving}
          error={error}
          onSave={(data) => handleEditTask(editingTask.id, data)}
          onCancel={() => setEditingTask(null)}
        />
      )}

    </main>
  );
}
