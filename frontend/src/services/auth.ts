import api from './api';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  lastLoginAt: Date | null;
  samlNameId?: string | null;
  samlEntityId?: string | null;
  samlAttributes?: any;
}

export interface SignupData {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export const authService = {
  async signup(data: SignupData) {
    const response = await api.post('/api/auth/signup', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  async login(data: LoginData) {
    const response = await api.post('/api/auth/login', data);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get('/api/auth/me');
    return response.data.user;
  },

  async getSamlLogs() {
    const response = await api.get('/api/auth/me/saml-logs');
    return response.data.logs;
  },

  logout() {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },
};
