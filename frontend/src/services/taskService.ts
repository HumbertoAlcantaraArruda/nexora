
import {api} from './api';
import type { Task } from '../types/kanban';

interface TaskResponse {
  mensagem: string;
  tarefa: Task;
}

interface TasksResponse {
  mensagem: string;
  tarefas: Task[];
}

export async function getTasks(): Promise<Task[]> {
  const response = await api.get<TasksResponse>('/tasks');
  return response.data.tarefas;
}

export async function createTask(data: {
  board_column_id: number;
  title: string;
  description?: string | null;
  priority?: Task['priority'];
  due_date?: string | null;
  position?: number;
  assignee_id?: number | null;
}): Promise<Task> {
  const response = await api.post<TaskResponse>('/tasks', data);
  return response.data.tarefa;
}

export async function updateTask(
  id: number,
  data: Partial<
    Pick<
      Task,
      | 'board_column_id'
      | 'title'
      | 'description'
      | 'priority'
      | 'due_date'
      | 'position'
      | 'assignee_id'
    >
  >,
): Promise<Task> {
  const response = await api.patch<TaskResponse>(`/tasks/${id}`, data);
  return response.data.tarefa;
}

export interface ColumnTaskOrder {
  id: number;
  task_ids: number[];
}

// Salva, em uma única transação, a ordem completa das tarefas de cada coluna
// informada. Cada coluna deve listar todas as tarefas que ficarão nela.
export async function reorderTasks(
  columns: ColumnTaskOrder[],
): Promise<Task[]> {
  const response = await api.put<TasksResponse>('/tasks/reorder', { columns });
  return response.data.tarefas;
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
