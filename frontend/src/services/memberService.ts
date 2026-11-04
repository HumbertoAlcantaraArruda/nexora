import { api } from './api';
import type { PlatformUser } from './userService';

// Permissões que o dono pode conceder ao compartilhar um quadro.
export type ShareRole = 'viewer' | 'editor';

export const SHARE_ROLE_LABELS: Record<ShareRole, string> = {
  viewer: 'Pode visualizar',
  editor: 'Pode editar',
};

// Pessoa que já aceitou o convite e tem acesso ao quadro.
export interface BoardMember extends PlatformUser {
  role: ShareRole;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined';

// Convite para acessar um quadro: o convidado aceita ou recusa.
export interface BoardInvitation {
  id: number;
  role: ShareRole;
  status: InvitationStatus;
  created_at: string | null;
  responded_at: string | null;
  board: { id: number; name: string; description: string | null } | null;
  inviter: PlatformUser | null;
  invitee: PlatformUser | null;
}

export interface BoardSharing {
  members: BoardMember[];
  invitations: BoardInvitation[];
}

interface SharingResponse {
  mensagem: string;
  membros: BoardMember[];
  convites: BoardInvitation[];
  email_enviado?: boolean;
}

function toSharing(data: SharingResponse): BoardSharing {
  return { members: data.membros, invitations: data.convites };
}

// ---- Dono do quadro ---------------------------------------------------------

// Quem tem acesso e os convites pendentes (somente o dono consulta).
export async function getSharing(boardId: number): Promise<BoardSharing> {
  const response = await api.get<SharingResponse>(`/boards/${boardId}/members`);
  return toSharing(response.data);
}

// Convida um usuário: ele recebe um e-mail e aceita ou recusa. Convidar de
// novo quem tem convite pendente troca a permissão e reenvia o e-mail.
export async function inviteMember(
  boardId: number,
  userId: number,
  role: ShareRole,
): Promise<BoardSharing & { emailSent: boolean }> {
  const response = await api.post<SharingResponse>(
    `/boards/${boardId}/invitations`,
    { user_id: userId, role },
  );
  return { ...toSharing(response.data), emailSent: response.data.email_enviado ?? false };
}

export async function cancelInvitation(
  boardId: number,
  invitationId: number,
): Promise<BoardSharing> {
  const response = await api.delete<SharingResponse>(
    `/boards/${boardId}/invitations/${invitationId}`,
  );
  return toSharing(response.data);
}

export async function updateMemberRole(
  boardId: number,
  userId: number,
  role: ShareRole,
): Promise<BoardSharing> {
  const response = await api.patch<SharingResponse>(
    `/boards/${boardId}/members/${userId}`,
    { role },
  );
  return toSharing(response.data);
}

// Remove o acesso. Com o próprio id, é "sair do quadro".
export async function removeMember(boardId: number, userId: number): Promise<void> {
  await api.delete(`/boards/${boardId}/members/${userId}`);
}

// ---- Convidado --------------------------------------------------------------

interface InvitationsResponse {
  mensagem: string;
  convites: BoardInvitation[];
}

interface InvitationResponse {
  mensagem: string;
  convite: BoardInvitation;
}

// Convites pendentes recebidos pelo usuário.
export async function getMyInvitations(): Promise<BoardInvitation[]> {
  const response = await api.get<InvitationsResponse>('/invitations');
  return response.data.convites;
}

export async function getInvitation(id: number): Promise<BoardInvitation> {
  const response = await api.get<InvitationResponse>(`/invitations/${id}`);
  return response.data.convite;
}

export async function acceptInvitation(id: number): Promise<BoardInvitation> {
  const response = await api.post<InvitationResponse>(`/invitations/${id}/accept`);
  return response.data.convite;
}

export async function declineInvitation(id: number): Promise<BoardInvitation> {
  const response = await api.post<InvitationResponse>(`/invitations/${id}/decline`);
  return response.data.convite;
}
