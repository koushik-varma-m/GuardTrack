import api from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

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

export interface LoginResponse {
  token: string;
  user: User;
}

export interface LdapLoginCredentials {
  username: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'GUARD' | 'ANALYST' | 'ADMIN';
  rfidTag?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    
    const { user, token } = response.data;
    
    // Persist in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  async signup(data: SignupData): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/signup', data);
    
    const { user, token } = response.data;
    
    // Persist in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  async register(userData: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: 'GUARD' | 'ANALYST' | 'ADMIN';
    rfidTag?: string;
  }): Promise<User> {
    const response = await api.post<User>('/auth/register', userData);
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  async ldapLogin(username: string, password: string): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/ldap-login', { username, password });

    const { user, token } = response.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    return response.data;
  },
};
