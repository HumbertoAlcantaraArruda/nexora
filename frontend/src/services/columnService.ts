import {api} from './api';
import type { KanbanColumn } from '../types/kanban';

interface ColumnResponse {
  mensagem: string;
  coluna: KanbanColumn;
}

interface ColumnsResponse {
  mensagem: string;
  colunas: KanbanColumn[];
}

export async function getColumns(): Promise<KanbanColumn[]> {
  const response = await api.get<ColumnsResponse>('/columns');
  return response.data.colunas;
}

export async function createColumn(data: {
  board_id: number;
  name: string;
  position?: number;
}): Promise<KanbanColumn> {
  const response = await api.post<ColumnResponse>('/columns', data);
  return response.data.coluna;
}

export async function updateColumn(
  id: number,
  data: Partial<Pick<KanbanColumn, 'name' | 'position'>>,
): Promise<KanbanColumn> {
  const response = await api.patch<ColumnResponse>(`/columns/${id}`, data);
  return response.data.coluna;
}

// Salva, em uma única transação, a ordem completa das colunas do quadro.
// A lista deve conter todas as colunas do quadro, na nova ordem.
export async function reorderColumns(
  boardId: number,
  columnIds: number[],
): Promise<KanbanColumn[]> {
  const response = await api.put<ColumnsResponse>('/columns/reorder', {
    board_id: boardId,
    column_ids: columnIds,
  });
  return response.data.colunas;
}

export async function deleteColumn(id: number): Promise<void> {
  await api.delete(`/columns/${id}`);
}
