import { isAxiosError } from "axios";

export function isSessionExpiredError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

// Converte falhas da API em mensagens para o usuário, sem expor detalhes
// internos (stack traces, SQL, nomes de campos do backend etc.).
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return `${fallback} Verifique sua conexão com o servidor e tente novamente.`;
  }

  switch (error.response.status) {
    case 401:
      return "Sua sessão expirou. Faça login novamente.";
    case 403:
    case 404:
      return `${fallback} O item não existe mais ou você não tem permissão para alterá-lo.`;
    case 422:
      return `${fallback} Os dados enviados são inválidos ou estavam desatualizados.`;
    default:
      return `${fallback} Tente novamente em instantes.`;
  }
}
