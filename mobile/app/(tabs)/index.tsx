import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Vehicle } from '@shared/types/index';
import { serviceBookApi, vehiclesApi } from '../../src/api';
import { useAuthStore } from '../../src/store/authStore';
import { Page, SectionCard, styles } from '../../src/components/ui';
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
          <Text style={styles.eyebrow}>AUTOMARKET</Text>
          <Text style={styles.pageTitle}>{t('home.greeting', { name: user?.full_name || t('home.driver') })}</Text>
          <Text style={styles.mutedText}>
            {user?.role === 'master' ? t('home.masterCabinet') : t('home.clientSubtitle')}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={styles.logoutButton}>
          <Text style={styles.logoutText}>{t('home.settings')}</Text>
        </Pressable>
      </View>

      {dueWorks.length > 0 ? (
        <View style={{ marginTop: 18, gap: 9 }}>
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

      <SectionCard style={styles.heroCard}>
        <Text style={styles.heroIcon}>🛠️</Text>
        <Text style={styles.heroTitle}>{t('home.heroTitle')}</Text>
        <Text style={styles.heroDescription}>{t('home.heroDescription')}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.sosButton}
          onPress={() => router.push('/sos')}
        >
          <Text style={styles.sosButtonText}>{t('home.sos')}</Text>
        </Pressable>
        {isClient ? (
          <Pressable
            accessibilityRole="button"
            style={[styles.primaryButton, { marginTop: 10 }]}
            onPress={() => router.push('/planned')}
          >
            <Text style={styles.primaryButtonText}>{t('home.planned')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          style={[styles.secondaryButton, { marginTop: 10, alignItems: 'center' }]}
          onPress={() => router.push('/(tabs)/services')}
        >
          <Text style={styles.secondaryButtonText}>{t('home.allServices')}</Text>
        </Pressable>
      </SectionCard>

      <Text style={styles.sectionTitle}>{t('home.quickAccess')}</Text>
      <View style={styles.shortcutGrid}>
        <Shortcut label={t('home.myVehicles')} icon="🚙" onPress={() => router.push('/(tabs)/vehicles')} />
        <Shortcut label={t('home.myOrders')} icon="📋" onPress={() => router.push('/(tabs)/orders')} />
      </View>
      <Text style={[styles.mutedText, { marginTop: 24, color: colors.muted }]}>
        {t('home.footer')}
      </Text>
    </Page>
  );
}

function Shortcut({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.shortcutCard}>
      <Text style={styles.shortcutIcon}>{icon}</Text>
      <Text style={styles.shortcutLabel}>{label}</Text>
      <Text style={styles.shortcutArrow}>→</Text>
    </Pressable>
  );
}
