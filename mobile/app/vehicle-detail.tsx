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
import { NUMBER_LOCALE, useT } from '../src/i18n';
import { colors } from '../src/theme';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
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
        setError(apiErrorMessage(cause, t('vehicle.loadFailed')));
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
    Alert.alert(t('vehicle.deleteTitle'), t('vehicle.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await vehiclesApi.remove(id!);
            router.back();
          } catch (cause) {
            Alert.alert(t('common.error'), apiErrorMessage(cause, t('vehicle.deleteFailed')));
          }
        },
      },
    ]);
  };

  const removeEntry = (entry: ServiceBookEntry) => {
    Alert.alert(t('entry.deleteTitle'), entry.title, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await serviceBookApi.remove(id!, entry.id);
            await load();
          } catch (cause) {
            Alert.alert(t('common.error'), apiErrorMessage(cause, t('entry.deleteFailed')));
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
        <EmptyState message={error || t('vehicle.notFound')} actionLabel={t('common.retry')} onAction={() => void load()} />
      </View>
    );
  }

  const upcoming = upcomingWorks(entries, vehicle);
  const specs: [string, string | undefined][] = [
    [t('vehicle.plateLabel'), vehicle.plate_number],
    ['VIN', vehicle.vin],
    [t('vehicle.color'), vehicle.color],
    [t('vehicle.engine'), [vehicle.engine_volume ? t('units.liters', { value: vehicle.engine_volume }) : '', optionLabel(engineTypes, vehicle.engine_type)].filter(Boolean).join(', ')],
    [t('vehicle.gearbox'), optionLabel(transmissions, vehicle.transmission)],
    [t('vehicle.mileageLabel'), vehicle.current_mileage != null ? formatKm(vehicle.current_mileage) : undefined],
    [t('vehicle.oil'), vehicle.oil_type],
    [t('vehicle.tires'), vehicle.tire_size],
    [t('vehicle.notes'), vehicle.notes],
  ];

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, { paddingTop: styles.pageContent.paddingTop + insets.top }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.primary} />}
    >
      <BackButton onPress={() => router.back()} />
      <Text style={styles.eyebrow}>{t('vehicles.eyebrow')}</Text>
      <Text style={styles.pageTitle}>
        {vehicle.make} {vehicle.model}
      </Text>
      <Text style={styles.mutedText}>{t('vehicle.yearOfManufacture', { year: vehicle.year })}</Text>

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
            <Text style={styles.secondaryButtonText}>{t('common.edit')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.secondaryButton, { marginTop: 0, alignItems: 'center' }]}
            onPress={removeVehicle}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.error }]}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      </SectionCard>

      <Text style={styles.sectionTitle}>{t('vehicle.upcoming')}</Text>
      {upcoming.length === 0 ? (
        <Text style={styles.mutedText}>
          {t('vehicle.upcomingEmpty')}
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
                {item.status === 'overdue' ? t('vehicle.dueNow') : item.status === 'soon' ? t('home.dueSoon') : ''}
                {upcomingText(item)}
              </Text>
              <Text style={[styles.mutedText, { fontSize: 12, marginTop: 4 }]}>
                {t('vehicle.nextReplacement')}
                {[
                  item.entry.next_service_mileage != null ? t('vehicle.atKm', { km: formatKm(item.entry.next_service_mileage) }) : '',
                  item.entry.next_service_date ? t('vehicle.byDate', { date: formatDate(item.entry.next_service_date) }) : '',
                ]
                  .filter(Boolean)
                  .join(t('reminder.or'))}
              </Text>
              {item.status !== 'ok' ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({ pathname: '/planned', params: { vehicleId: vehicle.id, work: item.work.label } })
                  }
                >
                  <Text style={[styles.link, { marginTop: 8 }]}>{t('vehicle.bookMaster')}</Text>
                </Pressable>
              ) : null}
            </SectionCard>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>{t('vehicle.serviceBookTitle')}</Text>
      <Pressable
        accessibilityRole="button"
        style={[styles.primaryButton, { marginTop: 0, marginBottom: 12 }]}
        onPress={() => router.push({ pathname: '/service-entry', params: { vehicleId: vehicle.id } })}
      >
        <Text style={styles.primaryButtonText}>{t('vehicle.addEntry')}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        style={[styles.secondaryButton, { marginTop: 0, marginBottom: 14, alignItems: 'center' }]}
        onPress={() => router.push({ pathname: '/planned', params: { vehicleId: vehicle.id } })}
      >
        <Text style={styles.secondaryButtonText}>{t('vehicle.orderPlanned')}</Text>
      </Pressable>

      {entries.length === 0 ? (
        <Text style={styles.mutedText}>{t('vehicle.noEntries')}</Text>
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
                <Text style={styles.cardDescription}>{t('vehicles.mileage', { km: formatKm(entry.mileage_at_service) })}</Text>
                {entry.description ? <Text style={styles.cardDescription}>{entry.description}</Text> : null}
                {entry.cost != null ? (
                  <Text style={[styles.price, { marginTop: 6 }]}>{Number(entry.cost).toLocaleString(NUMBER_LOCALE)} ₸</Text>
                ) : null}
                {entry.next_service_mileage != null || entry.next_service_date ? (
                  <Text style={[styles.mutedText, { fontSize: 12, marginTop: 6 }]}>
                    {t('vehicle.next')}
                    {[
                      entry.next_service_mileage != null ? formatKm(entry.next_service_mileage) : '',
                      entry.next_service_date ? formatDate(entry.next_service_date) : '',
                    ]
                      .filter(Boolean)
                      .join(t('reminder.or'))}
                  </Text>
                ) : null}
              </SectionCard>
            </Pressable>
          );
        })
      )}
      {entries.length > 0 ? (
        <Text style={[styles.mutedText, { fontSize: 12, textAlign: 'center' }]}>
          {t('vehicle.longPressHint')}
        </Text>
      ) : null}
    </ScrollView>
  );
}
