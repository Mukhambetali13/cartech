import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { pushApi } from './api';
import { t, useLanguageStore } from './i18n';

const TOKEN_KEY = 'push-token';

// Уведомления показываем и когда приложение открыто
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushStatus = 'granted' | 'denied' | 'unavailable';

async function ensureChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('orders', {
    name: t('push.channel'),
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
  });
}

/**
 * Запрашивает разрешение и отправляет Expo push-токен на сервер вместе с языком,
 * чтобы уведомления приходили на нём. Безопасно вызывать повторно.
 */
export async function registerForPush({ ask = true } = {}): Promise<PushStatus> {
  if (!Device.isDevice) return 'unavailable';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('Push disabled: no EAS projectId (run `eas init` and set EAS_PROJECT_ID).');
    return 'unavailable';
  }

  await ensureChannel();
  let { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  if (!granted && ask && canAskAgain) {
    ({ granted } = await Notifications.requestPermissionsAsync());
  }
  if (!granted) return 'denied';

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await pushApi.register({ token, platform: Platform.OS, language: useLanguageStore.getState().language });
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return 'granted';
}

/** При выходе устройство перестаёт получать уведомления этого аккаунта */
export async function unregisterPush() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  if (!token) return;
  await pushApi.remove(token).catch(() => undefined);
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
}

export async function pushPermissionGranted() {
  return (await Notifications.getPermissionsAsync()).granted;
}

export function orderIdFrom(response: Notifications.NotificationResponse): string | null {
  const orderId = response.notification.request.content.data?.orderId;
  return typeof orderId === 'string' ? orderId : null;
}
