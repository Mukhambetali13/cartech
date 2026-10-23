import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { Page, SectionCard, styles } from '../../src/components/ui';
import { colors } from '../../src/theme';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <Page>
      <View style={styles.homeHeader}>
        <View>
          <Text style={styles.eyebrow}>AUTOMARKET</Text>
          <Text style={styles.pageTitle}>Здравствуйте, {user?.full_name || 'водитель'}!</Text>
          <Text style={styles.mutedText}>
            {user?.role === 'master' ? 'Кабинет мастера' : 'Ваш помощник для автомобиля'}
          </Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Выйти</Text>
        </Pressable>
      </View>

      <SectionCard style={styles.heroCard}>
        <Text style={styles.heroIcon}>🛠️</Text>
        <Text style={styles.heroTitle}>Нужна помощь с авто?</Text>
        <Text style={styles.heroDescription}>Найдите мастера или выберите услугу рядом с вами.</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.sosButton}
          onPress={() => router.push('/sos')}
        >
          <Text style={styles.sosButtonText}>🆘 Срочная помощь SOS</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, { marginTop: 10 }]}
          onPress={() => router.push('/(tabs)/services')}
        >
          <Text style={styles.primaryButtonText}>Все услуги</Text>
        </Pressable>
      </SectionCard>

      <Text style={styles.sectionTitle}>Быстрый доступ</Text>
      <View style={styles.shortcutGrid}>
        <Shortcut label="Мои автомобили" icon="🚙" onPress={() => router.push('/(tabs)/vehicles')} />
        <Shortcut label="Мои заказы" icon="📋" onPress={() => router.push('/(tabs)/orders')} />
      </View>
      <Text style={[styles.mutedText, { marginTop: 24, color: colors.muted }]}>
        Данные загружаются с вашего аккаунта AutoMarket.
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
