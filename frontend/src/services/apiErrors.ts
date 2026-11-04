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

// Mensagens de validação (422) por campo, como o backend as enviou.
// Ex.: { email: "Este e-mail já está em uso." }
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!isAxiosError(error) || error.response?.status !== 422) {
    return {};
  }

  const errors: unknown = error.response.data?.errors;

  if (!errors || typeof errors !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      String(Array.isArray(messages) ? messages[0] : messages),
    ]),
  );
}
