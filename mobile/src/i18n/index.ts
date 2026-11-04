import { useCallback } from 'react';
import { getLocales } from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import { kk } from './kk';
import { ru, type MessageKey } from './ru';

export type Language = 'ru' | 'kk';
export type { MessageKey };

const dictionaries: Record<Language, Record<MessageKey, string>> = { ru, kk };
const STORAGE_KEY = 'app-language';

/** Числа и даты: казахская локаль в Hermes поддерживается не везде, формат у них одинаковый */
export const NUMBER_LOCALE = 'ru-RU';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => Promise<void>;
}

function deviceLanguage(): Language {
  return getLocales().some((locale) => locale.languageCode === 'kk') ? 'kk' : 'ru';
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: deviceLanguage(),
  setLanguage: async (language) => {
    set({ language });
    await SecureStore.setItemAsync(STORAGE_KEY, language).catch(() => undefined);
  },
}));

/** Читает сохранённый язык; вызывается один раз при старте. */
export async function loadLanguage() {
  const saved = await SecureStore.getItemAsync(STORAGE_KEY).catch(() => null);
  if (saved === 'ru' || saved === 'kk') useLanguageStore.setState({ language: saved });
}

type Params = Record<string, string | number>;

export function translate(language: Language, key: MessageKey, params?: Params): string {
  const template = dictionaries[language][key] ?? ru[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** Перевод вне компонентов (сторы, хелперы). Компоненты используют useT, чтобы перерисоваться при смене языка. */
export function t(key: MessageKey, params?: Params): string {
  return translate(useLanguageStore.getState().language, key, params);
}

export function useT() {
  const language = useLanguageStore((state) => state.language);
  return useCallback((key: MessageKey, params?: Params) => translate(language, key, params), [language]);
}

export function useLanguage() {
  return useLanguageStore((state) => state.language);
}

/** Название категории/заказа на текущем языке, если есть казахский вариант */
export function localized(language: Language, ru: string, kk?: string | null) {
  return language === 'kk' && kk ? kk : ru;
}
