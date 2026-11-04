import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { authApi } from './api';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  address: string;
}

const MASTER_LOCATION_INTERVAL_MS = 10 * 60 * 1000;
let lastMasterUpdate = 0;

async function hasPermission(ask: boolean) {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

/**
 * Текущее местоположение клиента с адресом для заявки.
 * Возвращает null, если доступ к геолокации не дали.
 */
export async function pickCurrentLocation(): Promise<PickedLocation | null> {
  if (!(await hasPermission(true))) return null;
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const { latitude, longitude } = position.coords;
  let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (place) {
      const street = [place.street, place.streetNumber].filter(Boolean).join(', ');
      const parts = [place.city ?? place.subregion, street || place.name].filter(Boolean);
      if (parts.length) address = parts.join(', ');
    }
  } catch {
    // Без адреса тоже можно: мастер увидит точку на карте
  }
  return { latitude, longitude, address };
}

/**
 * Мастер сообщает своё местоположение, чтобы видеть расстояние до заявок
 * и получать SOS рядом. Не чаще раза в 10 минут; без доступа — молча пропускаем.
 */
export async function shareMasterLocation({ ask = false } = {}) {
  if (Date.now() - lastMasterUpdate < MASTER_LOCATION_INTERVAL_MS) return;
  if (!(await hasPermission(ask))) return;
  const position =
    (await Location.getLastKnownPositionAsync({ maxAge: MASTER_LOCATION_INTERVAL_MS })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  await authApi.updateLocation(position.coords.latitude, position.coords.longitude);
  lastMasterUpdate = Date.now();
}

/** Ссылка на точку в картах (откроется 2ГИС, Google Maps или Яндекс — что установлено) */
export function mapUrl(latitude: number, longitude: number) {
  return Platform.OS === 'ios'
    ? `https://maps.apple.com/?q=${latitude},${longitude}`
    : `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
}
