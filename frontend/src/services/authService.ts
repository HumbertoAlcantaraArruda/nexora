
import { api } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthResponse {
  mensagem: string;
  usuario: User;
  token: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface LoginData {
  email: string;
  password: string;
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/register', data);

  localStorage.setItem('token', response.data.token);

  return response.data;
}

export async function login(data: LoginData): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/login', data);

  localStorage.setItem('token', response.data.token);

  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/logout');
  } finally {
    localStorage.removeItem('token');
  }
}

export async function getAuthenticatedUser(): Promise<User> {
  const response = await api.get<{ mensagem: string; usuario: User }>('/user');

  return response.data.usuario;
}
