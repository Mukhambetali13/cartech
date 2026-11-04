import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../src/store/authStore';
import { loadLanguage, useLanguage } from '../src/i18n';
import { orderIdFrom, registerForPush } from '../src/notifications';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const userId = useAuthStore((state) => state.user?.id);
  const language = useLanguage();
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handledResponse = useRef<string | null>(null);

  useEffect(() => {
    // Язык читаем до профиля, чтобы первые экраны и ошибки были на нужном языке
    void loadLanguage().finally(() => void initialize());
  }, [initialize]);

  // Регистрируем устройство после входа и при смене языка (уведомления приходят на нём)
  useEffect(() => {
    if (!userId) return;
    registerForPush().catch((error) => console.warn('Push registration failed', error));
  }, [userId, language]);

  // Нажатие на уведомление открывает заявку — и из фона, и при холодном старте
  useEffect(() => {
    if (!userId || !lastResponse) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponse.current === id) return;
    handledResponse.current = id;
    const orderId = orderIdFrom(lastResponse);
    if (orderId) router.push({ pathname: '/order-detail', params: { id: orderId } });
  }, [userId, lastResponse, router]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f6f7f9' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="sos" options={{ presentation: 'modal' }} />
        <Stack.Screen name="order-detail" />
        <Stack.Screen name="planned" />
        <Stack.Screen name="vehicle-detail" />
        <Stack.Screen name="vehicle-form" />
        <Stack.Screen name="service-entry" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
