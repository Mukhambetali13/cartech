import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: 'client' | 'master';
  }) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await authApi.login({ email, password });
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (formData) => {
        set({ isLoading: true });
        try {
          const data = await authApi.register(formData);
          localStorage.setItem('token', data.token);
          set({ user: data.user, token: data.token, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      fetchMe: async () => {
        try {
          const user = await authApi.me();
          set({ user });
        } catch {
          localStorage.removeItem('token');
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
