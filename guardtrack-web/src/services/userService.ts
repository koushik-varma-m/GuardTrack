import api from './api';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'GUARD' | 'ANALYST' | 'ADMIN';
  rfidTag?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>('/auth/users');
    return response.data;
  },

  async create(data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: 'GUARD' | 'ANALYST' | 'ADMIN';
    rfidTag?: string;
  }): Promise<User> {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: 'GUARD' | 'ANALYST' | 'ADMIN';
      rfidTag?: string | null;
    }
  ): Promise<User> {
    const response = await api.put<User>(`/auth/users/${id}`, data);
    return response.data;
  },
};
