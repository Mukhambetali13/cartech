import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { LoginRequest, RegisterRequest, User } from '@shared/types/index';
import { authApi } from '../api';
import { t } from '../i18n';
import { unregisterPush } from '../notifications';

interface AuthState {
  user: User | null;
  initialized: boolean;
  initializationError: string | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'full_name' in value &&
    typeof value.full_name === 'string' &&
    'role' in value &&
    (value.role === 'client' || value.role === 'master')
  );
}

async function readCachedUser(): Promise<User | null> {
  const userJson = await SecureStore.getItemAsync('auth-user');
  if (!userJson) return null;

  try {
    const value: unknown = JSON.parse(userJson);
    if (isUser(value)) return value;
  } catch {
    await SecureStore.deleteItemAsync('auth-user');
    return null;
  }

  await SecureStore.deleteItemAsync('auth-user');
  return null;
}

async function clearAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync('auth-token'),
    SecureStore.deleteItemAsync('auth-user'),
  ]);
}

async function saveAuth(token: string, user: User): Promise<void> {
  try {
    await SecureStore.setItemAsync('auth-token', token);
    await SecureStore.setItemAsync('auth-user', JSON.stringify(user));
  } catch (error) {
    await clearAuth();
    throw error;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  initializationError: null,
  isLoading: false,

  initialize: async () => {
    let token: string | null;
    try {
      token = await SecureStore.getItemAsync('auth-token');
    } catch {
      set({
        initialized: true,
        initializationError: t('auth.secureReadFailed'),
      });
      return;
    }

    if (!token) {
      set({ user: null, initialized: true, initializationError: null });
      return;
    }

    try {
      const user = await authApi.me();
      await SecureStore.setItemAsync('auth-user', JSON.stringify(user));
      set({ user, initialized: true, initializationError: null });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        try {
          await clearAuth();
          set({ user: null, initialized: true, initializationError: null });
        } catch {
          set({
            user: null,
            initialized: true,
            initializationError: t('auth.clearFailed'),
          });
        }
        return;
      }

      try {
        set({
          user: await readCachedUser(),
          initialized: true,
          initializationError: null,
        });
      } catch {
        set({
          user: null,
          initialized: true,
          initializationError: t('auth.profileReadFailed'),
        });
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login({ email, password } satisfies LoginRequest);
      await saveAuth(data.token, data.user);
      set({ user: data.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authApi.register(data);
      await saveAuth(response.token, response.user);
      set({ user: response.user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await unregisterPush();
    await clearAuth();
    set({ user: null });
  },

  deleteAccount: async (password) => {
    // Сервер сам удаляет push-токены аккаунта
    await authApi.deleteAccount(password);
    await clearAuth();
    set({ user: null });
  },
}));
