import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServiceCategory } from '@shared/types/index';
import { MAX_OFFER_MARKUP } from '../src/pricing';
import { apiErrorMessage, ordersApi, servicesApi } from '../src/api';
import { useAuthStore } from '../src/store/authStore';
import { BackButton, EmptyState, Field, SectionCard, styles } from '../src/components/ui';
import { VehiclePicker } from '../src/components/VehiclePicker';
import { parseDate } from '../src/maintenance';
import { localized, NUMBER_LOCALE, useLanguage, useT } from '../src/i18n';
import { colors } from '../src/theme';

export default function PlannedRequestScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string; work?: string }>();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const language = useLanguage();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(params.vehicleId ?? null);
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadCategories = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const planned = (await servicesApi.categories()).filter((category) => category.service_type === 'planned');
      setCategories(planned);
      // Пришли из напоминания — сразу выбираем нужную работу
      if (params.work) {
        const match = planned.find(
          (category) => category.name === params.work || category.name_kk === params.work,
        );
        if (match) setSelectedSlug(match.slug);
        else setDescription(params.work);
      }
    } catch (cause) {
      setLoadError(apiErrorMessage(cause, t('planned.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [params.work, t]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const submit = async () => {
    const category = categories.find((item) => item.slug === selectedSlug);
    if (!category) {
      setError(t('planned.chooseWork'));
      return;
    }
    if (!vehicleId) {
      setError(t('planned.vehicleRequired'));
      return;
    }
    const clientPrice = parseFloat(price.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(clientPrice) || clientPrice <= 0) {
      setError(t('price.required'));
      return;
    }
    let scheduledAt: string | undefined;
    if (date.trim()) {
      const parsed = parseDate(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!parsed || parsed < today) {
        setError(t('planned.dateInvalid'));
        return;
      }
      parsed.setHours(10);
      scheduledAt = parsed.toISOString();
    }

    setError('');
    setSending(true);
    try {
      await ordersApi.create({
        service_type: 'planned',
        client_price: clientPrice,
        title: category.name,
        vehicle_id: vehicleId,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        scheduled_at: scheduledAt,
      });
      Alert.alert(t('sos.sentTitle'), t('planned.sentBody'), [
        { text: t('planned.viewOrders'), onPress: () => router.replace('/(tabs)/orders') },
      ]);
    } catch (cause) {
      setError(apiErrorMessage(cause, t('planned.sendFailed')));
    } finally {
      setSending(false);
    }
  };

  if (user?.role !== 'client') {
    return (
      <View style={[styles.page, { justifyContent: 'center', padding: 20 }]}>
        <EmptyState message={t('planned.clientsOnly')} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.pageContent, { paddingTop: styles.pageContent.paddingTop + insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={() => router.back()} />
        <Text style={styles.eyebrow}>{t('planned.eyebrow')}</Text>
        <Text style={styles.pageTitle}>{t('planned.title')}</Text>
        <Text style={[styles.mutedText, { marginBottom: 8 }]}>
          {t('planned.intro')}
        </Text>

        <Text style={styles.sectionTitle}>{t('planned.whatToDo')}</Text>
        {loading ? (
          <ActivityIndicator style={{ marginVertical: 28 }} color={colors.primary} />
        ) : loadError ? (
          <EmptyState message={loadError} actionLabel={t('common.retry')} onAction={() => void loadCategories()} />
        ) : (
          <View style={{ gap: 9 }}>
            {categories.map((category) => {
              const selected = selectedSlug === category.slug;
              return (
                <Pressable
                  key={category.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    setSelectedSlug(category.slug);
                    setError('');
                  }}
                >
                  <SectionCard style={[styles.sosServiceCard, selected && styles.sosServiceCardSelected]}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.cardTitle}>
                        {category.icon ? `${category.icon} ` : ''}
                        {localized(language, category.name, category.name_kk)}
                      </Text>
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                    </View>
                    {category.description ? (
                      <Text style={styles.cardDescription}>
                        {localized(language, category.description, category.description_kk)}
                      </Text>
                    ) : null}
                  </SectionCard>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>{t('common.vehicle')}</Text>
        <VehiclePicker value={vehicleId} onChange={setVehicleId} required />

        <Text style={styles.sectionTitle}>{t('planned.details')}</Text>
        <Field label={t('price.yourRequired')}>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={setPrice}
            placeholder={t('planned.pricePlaceholder')}
            keyboardType="numeric"
          />
          <Text style={[styles.mutedText, { fontSize: 12, marginTop: 7 }]}>
            {t('price.plannedHint', { max: MAX_OFFER_MARKUP.toLocaleString(NUMBER_LOCALE) })}
          </Text>
        </Field>
        <Field label={t('planned.date')}>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder={t('planned.datePlaceholder')}
            keyboardType="numbers-and-punctuation"
          />
        </Field>
        <Field label={t('planned.address')}>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder={t('planned.addressPlaceholder')} />
        </Field>
        <Field label={t('planned.comment')}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('planned.commentPlaceholder')}
            multiline
          />
        </Field>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, (sending || !selectedSlug) && styles.disabledButton]}
          disabled={sending || !selectedSlug}
          onPress={() => void submit()}
        >
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('planned.send')}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
