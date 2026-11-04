
import { api } from './api';

export interface Board {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface BoardResponse {
  mensagem: string;
  quadro: Board;
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

export async function getBoard(id: number): Promise<Board> {
  const response = await api.get<BoardResponse>(`/boards/${id}`);

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
