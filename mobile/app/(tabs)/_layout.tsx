import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useT } from '../../src/i18n';
import { colors } from '../../src/theme';

// Цветные эмодзи понятнее контурных значков; активную вкладку выделяем яркостью и подписью
const tabIcons: Record<string, string> = {
  index: '🏠',
  services: '🛠️',
  vehicles: '🚗',
  orders: '📋',
};

export default function TabsLayout() {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  const t = useT();

  if (!initialized) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 10, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 24, lineHeight: 28, opacity: focused ? 1 : 0.45 }}>{tabIcons[route.name]}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home') }} />
      <Tabs.Screen name="services" options={{ title: t('tabs.services') }} />
      <Tabs.Screen name="vehicles" options={{ title: t('tabs.vehicles') }} />
      <Tabs.Screen name="orders" options={{ title: t('tabs.orders') }} />
    </Tabs>
  );
}
