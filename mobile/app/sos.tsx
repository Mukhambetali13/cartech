import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { Service } from '@shared/types/index';
import { apiErrorMessage } from '../src/api/client';
import { ordersApi, servicesApi } from '../src/api';
import { useAuthStore } from '../src/store/authStore';
import { EmptyState, SectionCard, styles } from '../src/components/ui';
import { colors } from '../src/theme';

export default function SosRequestScreen() {
  const user = useAuthStore((state) => state.user);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const loadServices = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      setServices(await servicesApi.list({ service_type: 'sos' }));
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Не удалось загрузить SOS-услуги.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const submit = async () => {
    if (user?.role !== 'client') {
      setError('Создавать SOS-заявки может только клиентский аккаунт.');
      return;
    }
    const selectedService = services.find((service) => service.id === selectedServiceId);
    if (!selectedService) {
      setError('Выберите нужную SOS-услугу.');
      return;
    }
    if (!address.trim()) {
      setError('Укажите адрес, куда направить мастера.');
      return;
    }

    setError('');
    setSending(true);
    try {
      await ordersApi.create({
        service_id: selectedService.id,
        service_type: 'sos',
        title: selectedService.title,
        address: address.trim(),
      });
      Alert.alert('Заявка отправлена', 'Мастер получил вашу SOS-заявку.', [
        { text: 'Посмотреть заказ', onPress: () => router.replace('/(tabs)/orders') },
      ]);
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Не удалось отправить заявку. Проверьте подключение и попробуйте ещё раз.'));
    } finally {
      setSending(false);
    }
  };

  if (user?.role !== 'client') {
    return (
      <View style={[styles.page, { justifyContent: 'center', padding: 20 }]}>
        <EmptyState message="SOS-заявки могут создавать клиенты." />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>СРОЧНАЯ ПОМОЩЬ</Text>
      <Text style={styles.pageTitle}>SOS-заявка</Text>
      <Text style={[styles.mutedText, { marginBottom: 20 }]}>
        Выберите услугу и укажите адрес — остальные детали можно обсудить с мастером.
      </Text>

      <Text style={styles.sectionTitle}>Какая помощь нужна?</Text>
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 28 }} color={colors.primary} />
      ) : error && services.length === 0 ? (
        <EmptyState message={error} actionLabel="Повторить" onAction={() => void loadServices()} />
      ) : services.length === 0 ? (
        <EmptyState message="Сейчас в каталоге нет активных SOS-услуг." />
      ) : (
        <View style={{ gap: 9 }}>
          {services.map((service) => {
            const selected = selectedServiceId === service.id;
            return (
              <Pressable
                key={service.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  setSelectedServiceId(service.id);
                  setError('');
                }}
              >
                <SectionCard style={[styles.sosServiceCard, selected && styles.sosServiceCardSelected]}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{service.title}</Text>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioDot} /> : null}
                    </View>
                  </View>
                  {service.description ? (
                    <Text style={styles.cardDescription}>{service.description}</Text>
                  ) : null}
                  <Text style={styles.mutedText}>
                    {service.master_company || service.master_name || 'Мастер AutoMarket'}
                    {service.price_from != null
                      ? ` · от ${Number(service.price_from).toLocaleString('ru-RU')} ₽`
                      : ''}
                  </Text>
                </SectionCard>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Куда приехать?</Text>
      <TextInput
        accessibilityLabel="Адрес для SOS-заявки"
        style={styles.input}
        value={address}
        onChangeText={(value) => {
          setAddress(value);
          if (error) setError('');
        }}
        placeholder="Город, улица, дом или ориентир"
        autoCapitalize="sentences"
        returnKeyType="done"
      />
      <Text style={[styles.mutedText, { fontSize: 12, marginTop: 7 }]}>
        Например: Алматы, проспект Абая, 10
      </Text>

      {error && services.length > 0 ? <Text style={[styles.error, { marginTop: 14 }]}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        style={[styles.sosButton, (sending || loading || services.length === 0) && styles.disabledButton]}
        onPress={() => void submit()}
        disabled={sending || loading || services.length === 0}
      >
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.sosButtonText}>🆘 Отправить SOS-заявку</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
