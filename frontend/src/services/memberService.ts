import { api } from './api';

// Permissões que o dono pode conceder ao compartilhar um quadro.
export type ShareRole = 'viewer' | 'editor';

export const SHARE_ROLE_LABELS: Record<ShareRole, string> = {
  viewer: 'Pode visualizar',
  editor: 'Pode editar',
};

export interface BoardMember {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: ShareRole;
}

interface MembersResponse {
  mensagem: string;
  membros: BoardMember[];
}

// Pessoas com acesso ao quadro (somente o dono consulta).
export async function getMembers(boardId: number): Promise<BoardMember[]> {
  const response = await api.get<MembersResponse>(`/boards/${boardId}/members`);
  return response.data.membros;
}

// Compartilha com o usuário do e-mail; se ele já tem acesso, troca a permissão.
export async function addMember(
  boardId: number,
  email: string,
  role: ShareRole,
): Promise<BoardMember[]> {
  const response = await api.post<MembersResponse>(`/boards/${boardId}/members`, {
    email,
    role,
  });
  return response.data.membros;
}

export async function updateMemberRole(
  boardId: number,
  userId: number,
  role: ShareRole,
): Promise<BoardMember[]> {
  const response = await api.patch<MembersResponse>(
    `/boards/${boardId}/members/${userId}`,
    { role },
  );
  return response.data.membros;
}

// Remove o acesso. Com o próprio id, é "sair do quadro".
export async function removeMember(boardId: number, userId: number): Promise<void> {
  await api.delete(`/boards/${boardId}/members/${userId}`);
}
