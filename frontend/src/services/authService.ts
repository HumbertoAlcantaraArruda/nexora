
import { api } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  // Endereço da foto de perfil; nulo quando o usuário não enviou foto.
  avatar_url: string | null;
}

interface UserResponse {
  mensagem: string;
  usuario: User;
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

export async function updateProfile(data: {
  name?: string;
  email?: string;
  // Obrigatória quando o e-mail muda.
  current_password?: string;
}): Promise<User> {
  const response = await api.patch<UserResponse>('/user', data);

  return response.data.usuario;
}

export async function uploadAvatar(file: File): Promise<User> {
  const form = new FormData();
  form.append('avatar', file);

  const response = await api.post<UserResponse>('/user/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.usuario;
}

export async function removeAvatar(): Promise<User> {
  const response = await api.delete<UserResponse>('/user/avatar');

  return response.data.usuario;
}
