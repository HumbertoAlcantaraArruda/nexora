
import { api } from './api';
import type { KanbanColumn } from '../types/kanban';

// Permissão de quem está vendo o quadro: dono, pode editar ou só visualizar.
export type BoardPermission = 'owner' | 'editor' | 'viewer';

export interface BoardOwner {
  id: number;
  name: string;
  avatar_url: string | null;
}

export interface Board {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  permission: BoardPermission;
  owner: BoardOwner;
  // Presentes na listagem (GET /boards).
  columns_count?: number;
  tasks_count?: number;
}

// Quadro com colunas e tarefas (GET /boards/{id}).
export interface BoardWithColumns extends Board {
  columns: KanbanColumn[];
}

interface BoardResponse {
  mensagem: string;
  quadro: Board;
}

interface BoardWithColumnsResponse {
  mensagem: string;
  quadro: BoardWithColumns;
}

interface BoardsResponse {
  mensagem: string;
  quadros: Board[];
}

interface BoardData {
  name: string;
  description?: string | null;
}

export async function getBoards(): Promise<Board[]> {
  const response = await api.get<BoardsResponse>('/boards');

  return response.data.quadros;
}

export async function getBoard(id: number): Promise<BoardWithColumns> {
  const response = await api.get<BoardWithColumnsResponse>(`/boards/${id}`);

  return response.data.quadro;
}

export async function createBoard(data: BoardData): Promise<Board> {
  const response = await api.post<BoardResponse>('/boards', data);

  return response.data.quadro;
}

export async function updateBoard(
  id: number,
  data: Partial<BoardData>,
): Promise<Board> {
  const response = await api.patch<BoardResponse>(`/boards/${id}`, data);

  return response.data.quadro;
}

export async function deleteBoard(id: number): Promise<void> {
  await api.delete(`/boards/${id}`);
}

// Pode criar, editar, mover e excluir colunas e tarefas.
export function canEditBoard(board: Pick<Board, 'permission'>): boolean {
  return board.permission === 'owner' || board.permission === 'editor';
}
