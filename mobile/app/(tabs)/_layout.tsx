import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useAuthStore } from '../../src/store/authStore';
import { colors } from '../../src/theme';

const tabIcons: Record<string, string> = {
  index: '⌂',
  services: '⌕',
  vehicles: '🚗',
  orders: '▤',
};

export default function TabsLayout() {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);

  if (!initialized) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { height: 62, paddingTop: 6, paddingBottom: 7, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color }) => (
          <Text style={{ color, fontSize: 21, lineHeight: 24 }}>{tabIcons[route.name]}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная' }} />
      <Tabs.Screen name="services" options={{ title: 'Услуги' }} />
      <Tabs.Screen name="vehicles" options={{ title: 'Авто' }} />
      <Tabs.Screen name="orders" options={{ title: 'Заказы' }} />
    </Tabs>
  );
}
