import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Vehicle } from '@shared/types/index';
import { vehiclesApi } from '../api';
import { vehicleSummary } from '../maintenance';
import { useT } from '../i18n';
import { colors } from '../theme';
import { SectionCard, styles } from './ui';

/** Выбор автомобиля для заявки: мастер увидит марку, модель и год. */
export function VehiclePicker({ value, onChange, required = false }: {
  value: string | null;
  onChange: (vehicleId: string | null) => void;
  required?: boolean;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const t = useT();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      vehiclesApi
        .list()
        .then((list) => {
          if (!active) return;
          setVehicles(list);
          // Единственную машину выбираем сразу
          if (list.length === 1 && !value) onChange(list[0].id);
        })
        .catch(() => undefined)
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  if (loading) return <ActivityIndicator style={{ marginVertical: 14 }} color={colors.primary} />;

  return (
    <View style={{ gap: 9 }}>
      {vehicles.map((vehicle) => {
        const selected = vehicle.id === value;
        const summary = vehicleSummary(vehicle);
        return (
          <Pressable
            key={vehicle.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(selected && !required ? null : vehicle.id)}
          >
            <SectionCard style={[styles.sosServiceCard, selected && styles.sosServiceCardSelected]}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>🚗 {summary.title}</Text>
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
              </View>
              {summary.details ? <Text style={styles.cardDescription}>{summary.details}</Text> : null}
            </SectionCard>
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => router.push('/vehicle-form')}>
        <Text style={[styles.link, { paddingVertical: 6 }]}>{t('vehicle.add')}</Text>
      </Pressable>
    </View>
  );
}
