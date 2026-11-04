import { api } from './api';

// Usuário da plataforma como aparece para os outros: nome, e-mail e foto.
export interface PlatformUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface UsersResponse {
  mensagem: string;
  usuarios: PlatformUser[];
}

// Todos os usuários da plataforma (para escolher o responsável de uma tarefa).
export async function getUsers(): Promise<PlatformUser[]> {
  const response = await api.get<UsersResponse>('/users');
  return response.data.usuarios;
}
