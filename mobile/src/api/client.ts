import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { t, useLanguageStore } from '../i18n';

const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const apiBase = process.env.EXPO_PUBLIC_API_URL || `http://${defaultHost}:8080/api`;

/** Публичные страницы бэкенда (политика конфиденциальности и т.п.) живут рядом с /api */
export function publicPageUrl(path: string) {
  return apiBase.replace(/\/api\/?$/, '') + path;
}

export const api = axios.create({
  baseURL: apiBase,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = useLanguageStore.getState().language;
  return config;
});

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ error?: unknown }>(error)) {
    const message = error.response?.data?.error;
    if (typeof message === 'string' && message.trim()) return message;
    if (!error.response) return t('api.noConnection');
  }
  return fallback;
}
