import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

// Um 401 em requisição autenticada indica token inválido ou expirado:
// descarta o token e avisa a aplicação para voltar à tela de login.
// Requisições sem token (ex.: login com senha errada) não são afetadas.
api.interceptors.response.use(undefined, (error) => {
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    error.config?.headers?.Authorization
  ) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  return Promise.reject(error);
});
