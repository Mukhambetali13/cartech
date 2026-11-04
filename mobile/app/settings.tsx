import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiErrorMessage, publicPageUrl } from '../src/api';
import { useAuthStore } from '../src/store/authStore';
import { BackButton, Field, SectionCard, styles } from '../src/components/ui';
import { LanguageSwitch } from '../src/components/LanguageSwitch';
import { useT } from '../src/i18n';
import { pushPermissionGranted, registerForPush } from '../src/notifications';
import { colors } from '../src/theme';

export default function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useFocusEffect(
    useCallback(() => {
      pushPermissionGranted().then(setPushOn).catch(() => setPushOn(false));
    }, []),
  );

  const enablePush = async () => {
    try {
      const status = await registerForPush();
      setPushOn(status === 'granted');
      if (status === 'denied') {
        Alert.alert(t('settings.pushDenied'), undefined, [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.open'), onPress: () => void Linking.openSettings() },
        ]);
      } else if (status === 'unavailable') {
        Alert.alert(t('settings.pushUnavailable'));
      }
    } catch (cause) {
      Alert.alert(t('common.error'), apiErrorMessage(cause, t('settings.pushFailed')));
    }
  };

  const signOut = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const confirmDelete = () => {
    setDeleteError('');
    if (!password) {
      setDeleteError(t('settings.deletePasswordRequired'));
      return;
    }
    Alert.alert(t('settings.deleteConfirmTitle'), t('settings.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount(password);
            router.replace('/(auth)/login');
            Alert.alert(t('settings.deletedTitle'), t('settings.deletedBody'));
          } catch (cause) {
            setDeleteError(apiErrorMessage(cause, t('settings.deleteFailed')));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.pageContent, { paddingTop: styles.pageContent.paddingTop + insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={() => router.back()} />
        <Text style={styles.pageTitle}>{t('settings.title')}</Text>

        {user ? (
          <SectionCard style={{ marginTop: 6 }}>
            <Text style={styles.cardTitle}>{user.full_name}</Text>
            <Text style={styles.mutedText}>{user.email}</Text>
            <Text style={[styles.mutedText, { marginTop: 4 }]}>
              {user.role === 'master' ? t('auth.roleMaster') : t('auth.roleClient')}
            </Text>
          </SectionCard>
        ) : null}

        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <LanguageSwitch style={{ alignSelf: 'flex-start' }} />

        <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
        <SectionCard>
          {pushOn == null ? (
            <ActivityIndicator color={colors.primary} />
          ) : pushOn ? (
            <Text style={styles.cardDescription}>{t('settings.pushOn')}</Text>
          ) : (
            <>
              <Text style={styles.cardDescription}>{t('settings.pushOff')}</Text>
              <Pressable
                accessibilityRole="button"
                style={[styles.primaryButton, { marginTop: 12 }]}
                onPress={() => void enablePush()}
              >
                <Text style={styles.primaryButtonText}>{t('settings.enablePush')}</Text>
              </Pressable>
            </>
          )}
        </SectionCard>

        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <SectionCard>
          <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(publicPageUrl('/privacy'))}>
            <Text style={styles.link}>{t('settings.privacy')}</Text>
          </Pressable>
          <Text style={[styles.mutedText, { marginTop: 10, fontSize: 12 }]}>
            {t('settings.version', { version: Constants.expoConfig?.version ?? '—' })}
          </Text>
        </SectionCard>

        <Pressable
          accessibilityRole="button"
          style={[styles.secondaryButton, { marginTop: 22, alignItems: 'center' }]}
          onPress={() => void signOut()}
        >
          <Text style={styles.secondaryButtonText}>{t('settings.logout')}</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>{t('settings.dangerZone')}</Text>
        <SectionCard style={{ borderColor: colors.errorBackground }}>
          {!showDelete ? (
            <Pressable accessibilityRole="button" onPress={() => setShowDelete(true)}>
              <Text style={{ color: colors.error, fontWeight: '700' }}>{t('settings.deleteAccount')}</Text>
            </Pressable>
          ) : (
            <View>
              <Text style={[styles.cardDescription, { marginBottom: 12 }]}>{t('settings.deleteExplain')}</Text>
              <Field label={t('settings.deletePassword')}>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setDeleteError('');
                  }}
                  secureTextEntry
                  autoComplete="current-password"
                />
              </Field>
              {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                style={[styles.primaryButton, { backgroundColor: colors.error }, deleting && styles.disabledButton]}
                disabled={deleting}
                onPress={confirmDelete}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>{t('settings.deleteForever')}</Text>
                )}
              </Pressable>
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
