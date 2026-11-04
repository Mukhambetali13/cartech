import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { apiErrorMessage } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { AuthCard, Field, styles } from '../../src/components/ui';
import { LanguageSwitch } from '../../src/components/LanguageSwitch';
import { useT } from '../../src/i18n';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();
  const t = useT();

  const submit = async () => {
    setError('');
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (cause) {
      setError(apiErrorMessage(cause, t('auth.loginFailed')));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardPage}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LanguageSwitch style={{ alignSelf: 'center', marginBottom: 14 }} />
      <AuthCard title={t('auth.welcome')} subtitle={t('auth.loginSubtitle')}>
        <Field label="Email">
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </Field>
        <Field label={t('auth.password')}>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry
            autoComplete="current-password"
          />
        </Field>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={() => void submit()}
          disabled={isLoading || !email.trim() || !password}
        >
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('auth.signIn')}</Text>}
        </Pressable>
        <View style={styles.authFooter}>
          <Text style={styles.mutedText}>{t('auth.noAccount')}</Text>
          <Link href="/(auth)/register" style={styles.link}>{t('auth.signUp')}</Link>
        </View>
      </AuthCard>
      <Text style={styles.brandCaption}>🚗 AutoMarket</Text>
    </KeyboardAvoidingView>
  );
}
