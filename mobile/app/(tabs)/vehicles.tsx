import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Vehicle } from '@shared/types/index';
import { serviceBookApi, vehiclesApi } from '../../src/api';
import { EmptyState, Page, SectionCard, styles } from '../../src/components/ui';
import { formatKm, reminderColors, upcomingText, upcomingWorks, vehicleSummary, type UpcomingWork } from '../../src/maintenance';
import { useT } from '../../src/i18n';
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
  const t = useT();

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
      setError(t('vehicles.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

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
      <Text style={styles.primaryButtonText}>{t('vehicle.add')}</Text>
    </Pressable>
  );

  return (
    <Page scroll={false}>
      <View style={styles.pageContent}>
        <Text style={styles.eyebrow}>{t('vehicles.eyebrow')}</Text>
        <Text style={styles.pageTitle}>{t('home.myVehicles')}</Text>
        <Text style={[styles.mutedText, { marginBottom: 14 }]}>{t('vehicles.subtitle')}</Text>
        {!loading && !error ? addButton : null}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 36 }} color={colors.primary} />
      ) : error ? (
        <EmptyState message={error} actionLabel={t('common.retry')} onAction={() => void loadVehicles()} />
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
            <EmptyState message={t('vehicles.empty')} />
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
                  {item.plate_number ? <Text style={styles.cardDescription}>{t('vehicles.plate', { plate: item.plate_number })}</Text> : null}
                  {item.current_mileage != null ? (
                    <Text style={styles.cardDescription}>{t('vehicles.mileage', { km: formatKm(item.current_mileage) })}</Text>
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
                  <Text style={[styles.link, { marginTop: 10 }]}>{t('vehicles.serviceBook')}</Text>
                </SectionCard>
              </Pressable>
            );
          }}
        />
      )}
    </Page>
  );
}
