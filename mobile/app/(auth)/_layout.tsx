import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function AuthLayout() {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);

  if (!initialized) return null;
  if (user) return <Redirect href="/(tabs)" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
