import { ActivityIndicator, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { colors } from '../src/theme';

export default function Index() {
  const initialized = useAuthStore((state) => state.initialized);
  const initializationError = useAuthStore((state) => state.initializationError);
  const user = useAuthStore((state) => state.user);

  if (!initialized) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (initializationError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: colors.primaryDark, fontSize: 16, textAlign: 'center' }}>
          {initializationError}
        </Text>
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
