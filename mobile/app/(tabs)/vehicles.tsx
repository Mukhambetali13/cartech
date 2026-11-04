import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Vehicle } from '@shared/types/index';
import { serviceBookApi, vehiclesApi } from '../../src/api';
import { EmptyState, Page, SectionCard, styles } from '../../src/components/ui';
import { formatKm, reminderColors, upcomingText, upcomingWorks, vehicleSummary, type UpcomingWork } from '../../src/maintenance';
import { colors } from '../../src/theme';

interface VehicleWithReminder extends Vehicle {
  nextWork?: UpcomingWork;
}

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<VehicleWithReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const loadVehicles = useCallback(async (pullToRefresh = false) => {
    setError('');
    if (pullToRefresh) setRefreshing(true);
    try {
      const list = await vehiclesApi.list();
      const withReminders = await Promise.all(
        list.map(async (vehicle) => {
          try {
            const book = await serviceBookApi.get(vehicle.id);
            return { ...vehicle, nextWork: upcomingWorks(book.entries, vehicle)[0] };
          } catch {
            return vehicle;
          }
        }),
      );
      setVehicles(withReminders);
    } catch {
      setError('Не удалось загрузить автомобили. Проверьте подключение и попробуйте ещё раз.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadVehicles();
    }, [loadVehicles]),
  );

  const addButton = (
    <Pressable
      accessibilityRole="button"
      style={[styles.primaryButton, { marginTop: 0, marginBottom: 14 }]}
      onPress={() => router.push('/vehicle-form')}
    >
      <Text style={styles.primaryButtonText}>＋ Добавить автомобиль</Text>
    </Pressable>
  );

  return (
    <Page scroll={false}>
      <View style={styles.pageContent}>
        <Text style={styles.eyebrow}>ВАШ ГАРАЖ</Text>
        <Text style={styles.pageTitle}>Мои автомобили</Text>
        <Text style={[styles.mutedText, { marginBottom: 14 }]}>Данные авто, сервисная книжка и напоминания о ТО</Text>
        {!loading && !error ? addButton : null}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 36 }} color={colors.primary} />
      ) : error ? (
        <EmptyState message={error} actionLabel="Повторить" onAction={() => void loadVehicles()} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={vehicles.length === 0 ? styles.emptyList : { paddingBottom: 28 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadVehicles(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState message="Добавьте свой автомобиль — мастера увидят его данные, а мы напомним о замене масла и ТО." />
          }
          renderItem={({ item }) => {
            const summary = vehicleSummary(item);
            return (
              <Pressable onPress={() => router.push({ pathname: '/vehicle-detail', params: { id: item.id } })}>
                <SectionCard style={styles.listCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>
                      {item.make} {item.model}
                    </Text>
                    <Text style={styles.badge}>{item.year}</Text>
                  </View>
                  {summary.details ? <Text style={styles.cardDescription}>{summary.details}</Text> : null}
                  {item.plate_number ? <Text style={styles.cardDescription}>Номер: {item.plate_number}</Text> : null}
                  {item.current_mileage != null ? (
                    <Text style={styles.cardDescription}>Пробег: {formatKm(item.current_mileage)}</Text>
                  ) : null}
                  {item.nextWork ? (
                    <Text
                      style={[
                        styles.badge,
                        {
                          alignSelf: 'flex-start',
                          marginTop: 10,
                          color: reminderColors[item.nextWork.status].text,
                          backgroundColor: reminderColors[item.nextWork.status].background,
                        },
                      ]}
                    >
                      {item.nextWork.work.icon} {item.nextWork.work.label}: {upcomingText(item.nextWork)}
                    </Text>
                  ) : null}
                  <Text style={[styles.link, { marginTop: 10 }]}>Сервисная книжка →</Text>
                </SectionCard>
              </Pressable>
            );
          }}
        />
      )}
    </Page>
  );
}
