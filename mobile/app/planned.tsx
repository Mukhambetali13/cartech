import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServiceCategory } from '@shared/types/index';
import { apiErrorMessage, ordersApi, servicesApi } from '../src/api';
import { useAuthStore } from '../src/store/authStore';
import { BackButton, EmptyState, Field, SectionCard, styles } from '../src/components/ui';
import { VehiclePicker } from '../src/components/VehiclePicker';
import { parseDate } from '../src/maintenance';
import { colors } from '../src/theme';

export default function PlannedRequestScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string; work?: string }>();
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState<string | null>(params.vehicleId ?? null);
  const [date, setDate] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
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
        const match = planned.find((category) => category.name === params.work);
        if (match) setSelectedSlug(match.slug);
        else setDescription(params.work);
      }
    } catch (cause) {
      setLoadError(apiErrorMessage(cause, 'Не удалось загрузить виды работ.'));
    } finally {
      setLoading(false);
    }
  }, [params.work]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const submit = async () => {
    const category = categories.find((item) => item.slug === selectedSlug);
    if (!category) {
      setError('Выберите вид работ.');
      return;
    }
    if (!vehicleId) {
      setError('Выберите автомобиль — мастеру нужны марка, модель и год.');
      return;
    }
    let scheduledAt: string | undefined;
    if (date.trim()) {
      const parsed = parseDate(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!parsed || parsed < today) {
        setError('Желаемая дата — в формате ДД.ММ.ГГГГ и не в прошлом.');
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
        title: category.name,
        vehicle_id: vehicleId,
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        scheduled_at: scheduledAt,
      });
      Alert.alert('Заявка отправлена', 'Мастера увидят данные вашего авто и предложат цену.', [
        { text: 'Посмотреть заявки', onPress: () => router.replace('/(tabs)/orders') },
      ]);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Не удалось отправить заявку.'));
    } finally {
      setSending(false);
    }
  };

  if (user?.role !== 'client') {
    return (
      <View style={[styles.page, { justifyContent: 'center', padding: 20 }]}>
        <EmptyState message="Заказывать плановые работы могут клиенты." />
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
        <Text style={styles.eyebrow}>ПЛАНОВОЕ ТО</Text>
        <Text style={styles.pageTitle}>Плановые работы</Text>
        <Text style={[styles.mutedText, { marginBottom: 8 }]}>
          Замена масла, ремонт ходовой, капремонт двигателя и другое — мастера предложат цену и время.
        </Text>

        <Text style={styles.sectionTitle}>Что нужно сделать?</Text>
        {loading ? (
          <ActivityIndicator style={{ marginVertical: 28 }} color={colors.primary} />
        ) : loadError ? (
          <EmptyState message={loadError} actionLabel="Повторить" onAction={() => void loadCategories()} />
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
                        {category.name}
                      </Text>
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected ? <View style={styles.radioDot} /> : null}
                      </View>
                    </View>
                    {category.description ? <Text style={styles.cardDescription}>{category.description}</Text> : null}
                  </SectionCard>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={styles.sectionTitle}>Автомобиль</Text>
        <VehiclePicker value={vehicleId} onChange={setVehicleId} required />

        <Text style={styles.sectionTitle}>Детали</Text>
        <Field label="Желаемая дата">
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="ДД.ММ.ГГГГ"
            keyboardType="numbers-and-punctuation"
          />
        </Field>
        <Field label="Район или адрес">
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Алматы, Бостандыкский район" />
        </Field>
        <Field label="Комментарий для мастера">
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Стук спереди справа, своё масло есть и т.п."
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
          {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>📋 Отправить заявку</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
