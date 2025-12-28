import { create } from 'zustand';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; phone: string; tc_kimlik?: string; password: string }) => Promise<void>;
  googleLogin: (session_id: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authAPI.login(email, password);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Giriş yapılırken bir hata oluştu';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register(data);
      set({ user: response.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Kayıt olurken bir hata oluştu';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  googleLogin: async (session_id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await authAPI.googleCallback(session_id);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Google ile giriş yapılırken bir hata oluştu';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authAPI.logout();
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await authAPI.getToken();
      if (!token) {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return;
      }
      const user = await authAPI.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      await authAPI.removeToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  clearError: () => {
    set({ error: null });
  },
}));
