import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServiceBookEntry, Vehicle } from '@shared/types/index';
import { apiErrorMessage, serviceBookApi, vehiclesApi } from '../src/api';
import { BackButton, EmptyState, SectionCard, styles } from '../src/components/ui';
import {
  engineTypes,
  formatDate,
  formatKm,
  optionLabel,
  reminderColors,
  transmissions,
  upcomingText,
  upcomingWorks,
  workType,
} from '../src/maintenance';
import { colors } from '../src/theme';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [entries, setEntries] = useState<ServiceBookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (pullToRefresh = false) => {
      if (!id) return;
      setError('');
      if (pullToRefresh) setRefreshing(true);
      try {
        const [loadedVehicle, book] = await Promise.all([vehiclesApi.get(id), serviceBookApi.get(id)]);
        setVehicle(loadedVehicle);
        setEntries(book.entries);
      } catch (cause) {
        setError(apiErrorMessage(cause, 'Не удалось загрузить автомобиль.'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const removeVehicle = () => {
    Alert.alert('Удалить автомобиль?', 'Вместе с ним удалится сервисная книжка.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await vehiclesApi.remove(id!);
            router.back();
          } catch (cause) {
            Alert.alert('Ошибка', apiErrorMessage(cause, 'Не удалось удалить автомобиль.'));
          }
        },
      },
    ]);
  };

  const removeEntry = (entry: ServiceBookEntry) => {
    Alert.alert('Удалить запись?', entry.title, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await serviceBookApi.remove(id!, entry.id);
            await load();
          } catch (cause) {
            Alert.alert('Ошибка', apiErrorMessage(cause, 'Не удалось удалить запись.'));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.page, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !vehicle) {
    return (
      <View style={[styles.page, { padding: 20, paddingTop: 24 + insets.top }]}>
        <BackButton onPress={() => router.back()} />
        <EmptyState message={error || 'Автомобиль не найден.'} actionLabel="Повторить" onAction={() => void load()} />
      </View>
    );
  }

  const upcoming = upcomingWorks(entries, vehicle);
  const specs: [string, string | undefined][] = [
    ['Госномер', vehicle.plate_number],
    ['VIN', vehicle.vin],
    ['Цвет', vehicle.color],
    ['Двигатель', [vehicle.engine_volume ? `${vehicle.engine_volume} л` : '', optionLabel(engineTypes, vehicle.engine_type)].filter(Boolean).join(', ')],
    ['Коробка', optionLabel(transmissions, vehicle.transmission)],
    ['Пробег', vehicle.current_mileage != null ? formatKm(vehicle.current_mileage) : undefined],
    ['Масло ДВС', vehicle.oil_type],
    ['Шины', vehicle.tire_size],
    ['Заметки', vehicle.notes],
  ];

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, { paddingTop: styles.pageContent.paddingTop + insets.top }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
    >
      <BackButton onPress={() => router.back()} />
      <Text style={styles.eyebrow}>ВАШ ГАРАЖ</Text>
      <Text style={styles.pageTitle}>
        {vehicle.make} {vehicle.model}
      </Text>
      <Text style={styles.mutedText}>{vehicle.year} год выпуска</Text>

      <SectionCard style={{ marginTop: 16 }}>
        {specs
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <View key={label} style={[styles.rowBetween, { paddingVertical: 5 }]}>
              <Text style={styles.mutedText}>{label}</Text>
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>
                {value}
              </Text>
            </View>
          ))}
        <View style={[styles.rowGap, { marginTop: 10 }]}>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, { flex: 1, marginTop: 0, alignItems: 'center' }]}
            onPress={() => router.push({ pathname: '/vehicle-form', params: { id: vehicle.id } })}
          >
            <Text style={styles.secondaryButtonText}>✏️ Изменить</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, { marginTop: 0, alignItems: 'center' }]}
            onPress={removeVehicle}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.error }]}>Удалить</Text>
          </Pressable>
        </View>
      </SectionCard>

      <Text style={styles.sectionTitle}>Предстоящее ТО</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.mutedText}>
          Добавьте запись о работе с пробегом или датой следующей замены — приложение напомнит, когда пора.
        </Text>
      ) : (
        <View style={{ gap: 9 }}>
          {upcoming.map((item) => (
            <SectionCard
              key={item.entry.id}
              style={{ backgroundColor: reminderColors[item.status].background, borderColor: reminderColors[item.status].background }}
            >
              <Text style={styles.cardTitle}>
                {item.work.icon} {item.work.label}
              </Text>
              <Text style={{ color: reminderColors[item.status].text, fontWeight: '700', marginTop: 4 }}>
                {item.status === 'overdue' ? '⚠️ Пора! ' : item.status === 'soon' ? '⏰ Скоро: ' : ''}
                {upcomingText(item)}
              </Text>
              <Text style={[styles.mutedText, { fontSize: 12, marginTop: 4 }]}>
                Следующая замена:{' '}
                {[
                  item.entry.next_service_mileage != null ? `на ${formatKm(item.entry.next_service_mileage)}` : '',
                  item.entry.next_service_date ? `до ${formatDate(item.entry.next_service_date)}` : '',
                ]
                  .filter(Boolean)
                  .join(' или ')}
              </Text>
              {item.status !== 'ok' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/planned', params: { vehicleId: vehicle.id, work: item.work.label } })
                  }
                >
                  <Text style={[styles.link, { marginTop: 8 }]}>Записаться к мастеру →</Text>
                </Pressable>
              ) : null}
            </SectionCard>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Сервисная книжка</Text>
      <Pressable
        accessibilityRole="button"
        style={[styles.primaryButton, { marginTop: 0, marginBottom: 12 }]}
        onPress={() => router.push({ pathname: '/service-entry', params: { vehicleId: vehicle.id } })}
      >
        <Text style={styles.primaryButtonText}>＋ Добавить запись о работе</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={[styles.secondaryButton, { marginTop: 0, marginBottom: 14, alignItems: 'center' }]}
        onPress={() => router.push({ pathname: '/planned', params: { vehicleId: vehicle.id } })}
      >
        <Text style={styles.secondaryButtonText}>📋 Заказать плановые работы</Text>
      </Pressable>

      {entries.length === 0 ? (
        <Text style={styles.mutedText}>Записей пока нет. Например, добавьте последнюю замену масла.</Text>
      ) : (
        entries.map((entry) => {
          const work = workType(entry.entry_type);
          return (
            <Pressable key={entry.id} onLongPress={() => removeEntry(entry)}>
              <SectionCard style={styles.listCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>
                    {work.icon} {entry.title}
                  </Text>
                  <Text style={styles.badge}>{formatDate(entry.serviced_at)}</Text>
                </View>
                <Text style={styles.cardDescription}>Пробег: {formatKm(entry.mileage_at_service)}</Text>
                {entry.description ? <Text style={styles.cardDescription}>{entry.description}</Text> : null}
                {entry.cost != null ? (
                  <Text style={[styles.price, { marginTop: 6 }]}>{Number(entry.cost).toLocaleString('ru-RU')} ₸</Text>
                ) : null}
                {entry.next_service_mileage != null || entry.next_service_date ? (
                  <Text style={[styles.mutedText, { fontSize: 12, marginTop: 6 }]}>
                    Следующая:{' '}
                    {[
                      entry.next_service_mileage != null ? formatKm(entry.next_service_mileage) : '',
                      entry.next_service_date ? formatDate(entry.next_service_date) : '',
                    ]
                      .filter(Boolean)
                      .join(' или ')}
                  </Text>
                ) : null}
              </SectionCard>
            </Pressable>
          );
        })
      )}
      {entries.length > 0 ? (
        <Text style={[styles.mutedText, { fontSize: 12, textAlign: 'center' }]}>
          Удерживайте запись, чтобы удалить её
        </Text>
      ) : null}
    </ScrollView>
  );
}
