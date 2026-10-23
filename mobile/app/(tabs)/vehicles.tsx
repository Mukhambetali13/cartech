import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import type { Vehicle } from '@shared/types/index';
import { vehiclesApi } from '../../src/api';
import { EmptyState, Page, SectionCard, styles } from '../../src/components/ui';
import { colors } from '../../src/theme';

export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadVehicles = useCallback(async (pullToRefresh = false) => {
    setError('');
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setVehicles(await vehiclesApi.list());
    } catch {
      setError('Не удалось загрузить автомобили. Проверьте подключение и попробуйте ещё раз.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadVehicles();
  }, [loadVehicles]);

  return (
    <Page scroll={false}>
      <View style={styles.pageContent}>
        <Text style={styles.eyebrow}>ВАШ ГАРАЖ</Text>
        <Text style={styles.pageTitle}>Мои автомобили</Text>
        <Text style={[styles.mutedText, { marginBottom: 18 }]}>Автомобили, добавленные в аккаунт</Text>
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
          contentContainerStyle={vehicles.length === 0 ? styles.emptyList : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadVehicles(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={<EmptyState message="Автомобилей пока нет." />}
          renderItem={({ item }) => (
            <SectionCard style={styles.listCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.make} {item.model}</Text>
                <Text style={styles.badge}>{item.year}</Text>
              </View>
              {item.plate_number ? <Text style={styles.cardDescription}>Номер: {item.plate_number}</Text> : null}
              {item.engine_type ? <Text style={styles.cardDescription}>Двигатель: {item.engine_type}</Text> : null}
              {item.current_mileage != null ? (
                <Text style={styles.cardDescription}>Пробег: {Number(item.current_mileage).toLocaleString('ru-RU')} км</Text>
              ) : null}
            </SectionCard>
          )}
        />
      )}
    </Page>
  );
}
