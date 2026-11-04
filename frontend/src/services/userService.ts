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

// A busca só acontece a partir deste número de letras.
export const USER_SEARCH_MIN = 2;

// Busca usuários pelo nome (ou e-mail): no máximo 10 resultados. Os usuários
// nunca são listados todos de uma vez.
export async function searchUsers(
  term: string,
  signal?: AbortSignal,
): Promise<PlatformUser[]> {
  const response = await api.get<UsersResponse>('/users', {
    params: { search: term },
    signal,
  });
  return response.data.usuarios;
}
