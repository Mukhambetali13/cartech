import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import type { UserRole } from '@shared/types/index';
import { apiErrorMessage } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { AuthCard, Field, styles } from '../../src/components/ui';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('client');
  const [error, setError] = useState('');
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const router = useRouter();

  const submit = async () => {
    setError('');
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов.');
      return;
    }
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        role,
      });
      router.replace('/(tabs)');
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Не удалось создать аккаунт.'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardPage}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.authScroll} keyboardShouldPersistTaps="handled">
        <AuthCard title="Создать аккаунт" subtitle="Присоединяйтесь к AutoMarket">
          <View style={styles.roleRow}>
            {(['client', 'master'] as const).map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected: role === item }}
                style={[styles.roleButton, role === item && styles.roleButtonActive]}
                onPress={() => setRole(item)}
              >
                <Text style={[styles.roleText, role === item && styles.roleTextActive]}>
                  {item === 'client' ? '🚗 Клиент' : '🔧 Мастер / СТО'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Field label="Имя / Название компании">
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder={role === 'master' ? 'Имя или название СТО' : 'Иван Иванов'}
              autoComplete="name"
            />
          </Field>
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
          <Field label="Телефон (необязательно)">
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+7 900 000 00 00"
              keyboardType="phone-pad"
            />
          </Field>
          <Field label="Пароль">
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Не менее 6 символов"
              secureTextEntry
              autoComplete="new-password"
            />
          </Field>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            accessibilityRole="button"
            style={[styles.primaryButton, isLoading && styles.disabledButton]}
            onPress={() => void submit()}
            disabled={isLoading || !fullName.trim() || !email.trim() || !password}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Создать аккаунт</Text>
            )}
          </Pressable>
          <View style={styles.authFooter}>
            <Text style={styles.mutedText}>Уже есть аккаунт? </Text>
            <Link href="/(auth)/login" style={styles.link}>Войти</Link>
          </View>
        </AuthCard>
      </ScrollView>
      <Text style={styles.brandCaption}>🚗 AutoMarket</Text>
    </KeyboardAvoidingView>
  );
}
