import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Vehicle } from '@shared/types/index';
import { serviceBookApi, vehiclesApi } from '../../src/api';
import { useAuthStore } from '../../src/store/authStore';
import { BigAction, Page, SectionCard, Tile, styles } from '../../src/components/ui';
import { reminderColors, upcomingText, upcomingWorks, type UpcomingWork } from '../../src/maintenance';
import { useT } from '../../src/i18n';
import { colors } from '../../src/theme';

interface DueWork extends UpcomingWork {
  vehicle: Vehicle;
}

/** Работы, которые пора или скоро пора делать, по всем машинам клиента. */
async function loadDueWorks(): Promise<DueWork[]> {
  const vehicles = await vehiclesApi.list();
  const books = await Promise.all(vehicles.map((vehicle) => serviceBookApi.get(vehicle.id).catch(() => null)));
  return vehicles.flatMap((vehicle, index) =>
    upcomingWorks(books[index]?.entries ?? [], vehicle)
      .filter((item) => item.status !== 'ok')
      .map((item) => ({ ...item, vehicle })),
  );
}

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const t = useT();
  const [dueWorks, setDueWorks] = useState<DueWork[]>([]);
  const isClient = user?.role === 'client';

  useFocusEffect(
    useCallback(() => {
      if (!isClient) return;
      loadDueWorks().then(setDueWorks).catch(() => undefined);
    }, [isClient]),
  );

  return (
    <Page>
      <View style={styles.homeHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>{t('home.greeting', { name: user?.full_name || t('home.driver') })}</Text>
          <Text style={styles.mutedText}>
            {isClient ? t('home.clientSubtitle') : t('home.masterCabinet')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.settings')}
          onPress={() => router.push('/settings')}
          style={styles.iconButton}
        >
          <Text style={styles.iconButtonText}>⚙️</Text>
        </Pressable>
      </View>

      {dueWorks.length > 0 ? (
        <View style={{ marginTop: 18, gap: 10 }}>
          {dueWorks.map((item) => (
            <Pressable
              key={item.entry.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/vehicle-detail', params: { id: item.vehicle.id } })}
            >
              <SectionCard
                style={{
                  backgroundColor: reminderColors[item.status].background,
                  borderColor: reminderColors[item.status].background,
                }}
              >
                <Text style={[styles.cardTitle, { color: reminderColors[item.status].text }]}>
                  {item.status === 'overdue' ? t('home.dueNow') : t('home.dueSoon')}
                  {item.work.label.toLowerCase()}
                </Text>
                <Text style={styles.cardDescription}>
                  {item.vehicle.make} {item.vehicle.model} — {upcomingText(item)}
                </Text>
              </SectionCard>
            </Pressable>
          ))}
        </View>
      ) : null}

      {isClient ? (
        <View style={{ marginTop: 22, gap: 14 }}>
          <BigAction
            icon="🆘"
            title={t('home.sosTitle')}
            text={t('home.sosText')}
            color={colors.sos}
            onPress={() => router.push('/sos')}
          />
          <BigAction
            icon="🔧"
            title={t('home.plannedTitle')}
            text={t('home.plannedText')}
            color={colors.primary}
            onPress={() => router.push('/planned')}
          />
        </View>
      ) : (
        <View style={{ marginTop: 22 }}>
          <BigAction
            icon="📋"
            title={t('home.masterOrdersTitle')}
            text={t('home.masterOrdersText')}
            color={colors.primary}
            onPress={() => router.push('/(tabs)/orders')}
          />
        </View>
      )}

      <View style={[styles.tileRow, { marginTop: 14 }]}>
        {isClient ? (
          <>
            <Tile icon="🚗" label={t('home.myVehicles')} onPress={() => router.push('/(tabs)/vehicles')} />
            <Tile icon="📋" label={t('home.myOrders')} onPress={() => router.push('/(tabs)/orders')} />
          </>
        ) : (
          <>
            <Tile icon="🛠️" label={t('tabs.services')} onPress={() => router.push('/(tabs)/services')} />
            <Tile icon="⚙️" label={t('home.settings')} onPress={() => router.push('/settings')} />
          </>
        )}
      </View>
    </Page>
  );
}
