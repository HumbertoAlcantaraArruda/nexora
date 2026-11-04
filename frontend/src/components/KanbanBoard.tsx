
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { isAxiosError } from "axios";
import type {
  ColumnDragState,
  KanbanColumn as Column,
  Task,
  TaskDragState,
} from "../types/kanban";
import { isColumnDrag } from "../dragTypes";

import { getBoard, type Board } from "../services/boardService";

import {
  createColumn,
  deleteColumn,
  reorderColumns,
  updateColumn,
} from "../services/columnService";

import {
  createTask,
  deleteTask,
  reorderTasks,
  updateTask,
} from "../services/taskService";

import {
  getApiErrorMessage,
  isSessionExpiredError,
} from "../services/apiErrors";

import ActionMenu from "./ActionMenu";
import { columnColor, defaultColumnColor } from "../columnColors";
import ColumnFormModal, { type ColumnFormData } from "./ColumnFormModal";
import Icon from "./Icon";
import KanbanColumn from "./KanbanColumn";
import TaskFormModal, { type TaskFormData } from "./TaskFormModal";
import TopBar from "./TopBar";

// Busca o quadro com colunas e tarefas, ordenadas por position.
async function fetchBoard(
  boardId: number,
): Promise<{ board: Board; columns: Column[] }> {
  const { columns, ...board } = await getBoard(boardId);

  return {
    board,
    columns: [...columns]
      .sort((a, b) => a.position - b.position)
      .map((column) => ({
        ...column,
        tasks: [...(column.tasks ?? [])].sort(
          (a, b) => a.position - b.position,
        ),
      })),
  };
}

interface KanbanBoardProps {
  boardId: number;
  // Dados do quadro vindos da lista do App (nome/descrição atualizados ao editar).
  board?: Board;
  onGoHome: () => void;
  onEditBoard: (board: Board) => void;
  onDeleteBoard: (board: Board) => void;
}

type TaskModalState =
  | { mode: "create"; columnId?: number }
  | { mode: "edit"; task: Task }
  | null;

type ColumnModalState =
  | { mode: "create" }
  | { mode: "edit"; column: Column }
  | null;

export default function KanbanBoard({
  boardId,
  board: boardFromList,
  onGoHome,
  onEditBoard,
  onDeleteBoard,
}: KanbanBoardProps) {
  const [fetchedBoard, setBoard] = useState<Board | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [columns, setColumns] = useState<Column[]>([]);
  const [taskModal, setTaskModal] = useState<TaskModalState>(null);
  const [columnModal, setColumnModal] = useState<ColumnModalState>(null);
  const [dragState, setDragState] = useState<TaskDragState | null>(null);
  const [columnDrag, setColumnDrag] = useState<ColumnDragState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Prefere os dados da lista do App, que refletem edições feitas no modal.
  const board = boardFromList ?? fetchedBoard;

  // Enquanto uma alteração é salva, outras ficam bloqueadas: evita requisições
  // concorrentes sobre as mesmas tarefas e permite desfazer com segurança.
  // O ref garante o bloqueio imediato; o state atualiza a interface.
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  // O componente é remontado (key) ao trocar de quadro, então carrega uma vez.
  useEffect(() => {
    async function loadBoard() {
      try {
        const result = await fetchBoard(boardId);
        setBoard(result.board);
        setColumns(result.columns);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError(getApiErrorMessage(err, "Não foi possível carregar o quadro."));
        }
      } finally {
        setLoading(false);
      }
    }

    void loadBoard();
  }, [boardId]);

  // Recarrega o quadro do servidor para que a tela reflita o que foi persistido.
  async function resyncBoard() {
    try {
      const result = await fetchBoard(boardId);
      setBoard(result.board);
      setColumns(result.columns);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        setNotFound(true);
        return;
      }

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

  // ---- Colunas --------------------------------------------------------------

  function openColumnModal(state: ColumnModalState) {
    setError("");
    setColumnModal(state);
  }

  async function handleSaveColumn({
    name,
    color,
  }: ColumnFormData): Promise<boolean> {
    const modal = columnModal;

    if (!modal) return false;

    const saved =
      modal.mode === "create"
        ? await runMutation("Não foi possível criar a coluna.", async () => {
            const column = await createColumn({
              board_id: boardId,
              name,
              position: columns.length,
              color,
            });

            setColumns((current) => [...current, { ...column, tasks: [] }]);
          })
        : await runMutation("Não foi possível salvar a coluna.", async () => {
            const updated = await updateColumn(modal.column.id, { name, color });

            setColumns((current) =>
              current.map((column) =>
                column.id === modal.column.id
                  ? { ...column, name: updated.name, color: updated.color }
                  : column,
              ),
            );
          });

    if (saved) setColumnModal(null);

    return saved;
  }

  async function handleDeleteColumn(columnId: number) {
    await runMutation("Não foi possível excluir a coluna.", async () => {
      await deleteColumn(columnId);

      setColumns((current) =>
        current.filter((column) => column.id !== columnId),
      );
    });
  }

  // ---- Tarefas --------------------------------------------------------------

  function openTaskModal(state: TaskModalState) {
    setError("");
    setTaskModal(state);
  }

  async function handleCreateTask(
    data: TaskFormData,
    columnId: number,
  ): Promise<boolean> {
    return runMutation("Não foi possível criar a tarefa.", async () => {
      const task = await createTask({
        board_column_id: columnId,
        ...data,
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

  // Salva os campos e, se o "Status" mudou, leva a tarefa para o fim da nova
  // coluna (renumerando origem e destino) na mesma operação protegida.
  async function handleUpdateTask(
    task: Task,
    data: TaskFormData,
    columnId: number,
  ): Promise<boolean> {
    const move =
      columnId !== task.board_column_id
        ? buildCrossColumnMove(task.id, columnId)
        : null;
    const snapshot = columns;

    return runMutation(
      "Não foi possível salvar a tarefa.",
      async () => {
        const updated = await updateTask(task.id, data);

        // Aplica os campos editados mantendo coluna/posição do estado local.
        const merge = (item: Task): Task =>
          item.id === task.id
            ? {
                ...item,
                title: updated.title,
                description: updated.description,
                priority: updated.priority,
                due_date: updated.due_date,
              }
            : item;

        if (!move) {
          setColumns((current) =>
            current.map((column) => ({
              ...column,
              tasks: column.tasks.map(merge),
            })),
          );
          return;
        }

        setColumns((current) =>
          current.map((column) => {
            if (column.id === move.source.id) {
              return { ...column, tasks: move.sourceTasks };
            }

            if (column.id === columnId) {
              return { ...column, tasks: move.destinationTasks.map(merge) };
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
            id: columnId,
            task_ids: move.destinationTasks.map((item) => item.id),
          },
        ]);
      },
      () => setColumns(snapshot),
    );
  }

  async function handleSaveTask(
    data: TaskFormData,
    columnId: number,
  ): Promise<boolean> {
    const modal = taskModal;

    if (!modal) return false;

    const saved =
      modal.mode === "create"
        ? await handleCreateTask(data, columnId)
        : await handleUpdateTask(modal.task, data, columnId);

    if (saved) setTaskModal(null);

    return saved;
  }

  async function handleDeleteTask(taskId: number): Promise<boolean> {
    const deleted = await runMutation(
      "Não foi possível excluir a tarefa.",
      async () => {
        await deleteTask(taskId);

        setColumns((current) =>
          current.map((column) => ({
            ...column,
            tasks: column.tasks
              .filter((task) => task.id !== taskId)
              .map((task, position) => ({ ...task, position })),
          })),
        );
      },
    );

    if (deleted) setTaskModal(null);

    return deleted;
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

  // ---- Reordenação de colunas ----------------------------------------------

  // Retorna a posição (0..n) entre as colunas onde o item foi solto,
  // comparando o cursor com o ponto médio horizontal de cada coluna.
  function getColumnInsertIndex(container: HTMLElement, clientX: number) {
    const sections = Array.from(
      container.querySelectorAll<HTMLElement>(":scope > .kanban-column"),
    );

    const index = sections.findIndex((section) => {
      const rect = section.getBoundingClientRect();
      return clientX < rect.left + rect.width / 2;
    });

    return index === -1 ? sections.length : index;
  }

  function handleColumnDragStart(columnId: number) {
    setColumnDrag({ columnId, insertIndex: null });
  }

  function handleColumnDragEnd() {
    setColumnDrag(null);
  }

  function handleColumnsDragOver(event: DragEvent<HTMLDivElement>) {
    if (!isColumnDrag(event)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const insertIndex = getColumnInsertIndex(
      event.currentTarget,
      event.clientX,
    );

    // dragover dispara continuamente; só atualiza quando algo muda.
    setColumnDrag((current) =>
      current && current.insertIndex !== insertIndex
        ? { ...current, insertIndex }
        : current,
    );
  }

  function handleColumnsDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!isColumnDrag(event)) return;

    const nextTarget = event.relatedTarget;

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return;
    }

    setColumnDrag((current) =>
      current ? { ...current, insertIndex: null } : current,
    );
  }

  async function handleColumnsDrop(event: DragEvent<HTMLDivElement>) {
    if (!isColumnDrag(event)) return;

    event.preventDefault();

    const insertIndex = getColumnInsertIndex(
      event.currentTarget,
      event.clientX,
    );
    const draggedId = columnDrag?.columnId;

    setColumnDrag(null);

    if (draggedId !== undefined) {
      await handleReorderColumns(draggedId, insertIndex);
    }
  }

  async function handleReorderColumns(columnId: number, insertIndex: number) {
    const fromIndex = columns.findIndex((column) => column.id === columnId);

    if (fromIndex === -1) return;

    // Ao remover a coluna da origem, os índices posteriores recuam uma casa.
    const toIndex = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;

    if (toIndex === fromIndex) return;

    const reordered = [...columns];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const reorderedColumns = reordered.map((column, position) => ({
      ...column,
      position,
    }));

    const snapshot = columns;

    await runMutation(
      "Não foi possível salvar a nova ordem das colunas.",
      async () => {
        // Atualiza a interface imediatamente; desfeito em caso de falha.
        setColumns(reorderedColumns);

        await reorderColumns(
          boardId,
          reorderedColumns.map((column) => column.id),
        );
      },
      () => setColumns(snapshot),
    );
  }

  // Indicador de inserção entre colunas; omitido quando soltar ali não
  // mudaria a ordem (logo antes ou logo depois da própria coluna).
  const draggedColumnIndex = columnDrag
    ? columns.findIndex((column) => column.id === columnDrag.columnId)
    : -1;
  const columnDropIndex =
    columnDrag?.insertIndex != null &&
    columnDrag.insertIndex !== draggedColumnIndex &&
    columnDrag.insertIndex !== draggedColumnIndex + 1
      ? columnDrag.insertIndex
      : null;

  const columnDropIndicator = (
    <div className="column-drop-indicator" aria-hidden="true" />
  );

  if (loading) {
    return <p className="loading-screen">Carregando quadro...</p>;
  }

  if (notFound || !board) {
    return (
      <>
        <TopBar
          title="Quadro não encontrado"
        />
        <div className="page-content">
          <div className="empty-state">
            <Icon name="board" size={40} />
            <h2>Este quadro não existe mais</h2>
            <p>Ele pode ter sido excluído ou você não tem acesso a ele.</p>
            <button
              type="button"
              className="button button-primary"
              onClick={onGoHome}
            >
              Ir para Meus quadros
            </button>
          </div>
        </div>
      </>
    );
  }

  const modalOpen = taskModal !== null || columnModal !== null;

  return (
    <>
      <TopBar
        title={board.name}
        subtitle={board.description}
        actions={
          <>
            {saving && (
              <span className="saving-indicator" role="status">
                Salvando...
              </span>
            )}

            <button
              type="button"
              className="button button-primary"
              onClick={() => openTaskModal({ mode: "create" })}
              disabled={saving || columns.length === 0}
              title={
                columns.length === 0
                  ? "Crie uma coluna antes de adicionar tarefas"
                  : undefined
              }
            >
              <Icon name="plus" size={16} />
              <span className="hide-on-mobile">Nova tarefa</span>
            </button>

            <ActionMenu
              label="Ações do quadro"
              disabled={saving}
              items={[
                { label: "Editar quadro", onSelect: () => onEditBoard(board) },
                {
                  label: "Excluir quadro",
                  danger: true,
                  onSelect: () => onDeleteBoard(board),
                },
              ]}
            />
          </>
        }
      />

      {error && !modalOpen && (
        <p className="alert alert-error board-alert" role="alert">
          {error}
        </p>
      )}

      {columns.length === 0 ? (
        // Quadro sem colunas: convite no centro em vez de um quadro vazio.
        <div className="page-content">
          <div className="empty-state">
            <Icon name="board" size={40} />
            <h2>Este quadro ainda não tem colunas</h2>
            <p>
              Crie colunas como "A fazer", "Em andamento" e "Concluído" para
              organizar suas tarefas.
            </p>
            <button
              type="button"
              className="button button-primary"
              onClick={() => openColumnModal({ mode: "create" })}
              disabled={saving}
            >
              <Icon name="plus" size={16} />
              Nova coluna
            </button>
          </div>
        </div>
      ) : (
        <div
          className="kanban-columns"
          onDragOver={handleColumnsDragOver}
          onDragLeave={handleColumnsDragLeave}
          onDrop={(event) => void handleColumnsDrop(event)}
        >
          {columns.map((column, index) => (
            <Fragment key={column.id}>
              {columnDropIndex === index && columnDropIndicator}
              <KanbanColumn
                column={column}
                color={columnColor(column, index)}
                busy={saving}
                onOpenTask={(task) => openTaskModal({ mode: "edit", task })}
                onEditColumn={(item) =>
                  openColumnModal({ mode: "edit", column: item })
                }
                onDropTask={handleDropTask}
                onReorderTask={handleReorderTask}
                onDeleteColumn={handleDeleteColumn}
                dragState={dragState}
                onTaskDragStart={handleTaskDragStart}
                onTaskDragOver={handleTaskDragOver}
                onTaskDragLeave={handleTaskDragLeave}
                onTaskDragEnd={handleTaskDragEnd}
                isColumnDragging={columnDrag?.columnId === column.id}
                onColumnDragStart={handleColumnDragStart}
                onColumnDragEnd={handleColumnDragEnd}
              />
            </Fragment>
          ))}

          {columnDropIndex === columns.length && columnDropIndicator}

          <button
            type="button"
            className="new-column"
            onClick={() => openColumnModal({ mode: "create" })}
            disabled={saving}
          >
            <Icon name="plus" size={16} />
            Nova coluna
          </button>
        </div>
      )}

      {taskModal && (
        <TaskFormModal
          task={taskModal.mode === "edit" ? taskModal.task : undefined}
          defaultColumnId={
            taskModal.mode === "create" ? taskModal.columnId : undefined
          }
          columns={columns}
          saving={saving}
          error={error}
          onSave={handleSaveTask}
          onDelete={
            taskModal.mode === "edit"
              ? () => handleDeleteTask(taskModal.task.id)
              : undefined
          }
          onCancel={() => setTaskModal(null)}
        />
      )}

      {columnModal && (
        <ColumnFormModal
          initialName={
            columnModal.mode === "edit" ? columnModal.column.name : undefined
          }
          initialColor={
            columnModal.mode === "edit"
              ? columnColor(
                  columnModal.column,
                  columns.findIndex((item) => item.id === columnModal.column.id),
                )
              : defaultColumnColor(columns.length)
          }
          saving={saving}
          error={error}
          onSave={handleSaveColumn}
          onCancel={() => setColumnModal(null)}
        />
      )}
    </>
  );
}
