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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAX_OFFER_MARKUP, type ServiceCategory } from '@shared/types/index';
import { apiErrorMessage } from '../src/api/client';
import { ordersApi, servicesApi } from '../src/api';
import { useAuthStore } from '../src/store/authStore';
import { EmptyState, SectionCard, styles } from '../src/components/ui';
import { VehiclePicker } from '../src/components/VehiclePicker';
import { colors } from '../src/theme';

// SOS-заявка не привязана к конкретному мастеру: её видят все мастера и предлагают цену.
const TOW_TRUCK_SLUG = 'tow-truck';

export default function SosRequestScreen() {
  const user = useAuthStore((state) => state.user);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const loadCategories = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const all = await servicesApi.categories();
      setCategories(all.filter((category) => category.service_type === 'sos'));
    } catch (cause) {
      setLoadError(apiErrorMessage(cause, 'Не удалось загрузить виды помощи.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const isTowTruck = selectedSlug === TOW_TRUCK_SLUG;

  const submit = async () => {
    if (user?.role !== 'client') {
      setError('Создавать SOS-заявки может только клиентский аккаунт.');
      return;
    }
    const category = categories.find((item) => item.slug === selectedSlug);
    if (!category) {
      setError('Выберите, какая помощь нужна.');
      return;
    }
    if (!address.trim()) {
      setError(isTowTruck ? 'Укажите, откуда забрать автомобиль.' : 'Укажите адрес, куда направить мастера.');
      return;
    }
    if (isTowTruck && !destination.trim()) {
      setError('Укажите, куда доставить автомобиль.');
      return;
    }

    const clientPrice = parseFloat(price.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(clientPrice) || clientPrice <= 0) {
      setError('Укажите, сколько вы готовы заплатить.');
      return;
    }

    setError('');
    setSending(true);
    try {
      await ordersApi.create({
        service_type: 'sos',
        client_price: clientPrice,
        title: category.name,
        vehicle_id: vehicleId ?? undefined,
        description: isTowTruck ? `Куда доставить: ${destination.trim()}` : undefined,
        address: address.trim(),
      });
      Alert.alert('Заявка отправлена', 'Заявку увидят мастера рядом — они согласятся с вашей ценой или предложат свою.', [
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
      contentContainerStyle={[styles.pageContent, { paddingTop: styles.pageContent.paddingTop + insets.top }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>СРОЧНАЯ ПОМОЩЬ</Text>
      <Text style={styles.pageTitle}>SOS-заявка</Text>
      <Text style={[styles.mutedText, { marginBottom: 20 }]}>
        Выберите, какая помощь нужна, укажите адрес и свою цену — мастера откликнутся, вы выберете лучшего.
      </Text>

      <Text style={styles.sectionTitle}>Какая помощь нужна?</Text>
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 28 }} color={colors.primary} />
      ) : loadError ? (
        <EmptyState message={loadError} actionLabel="Повторить" onAction={() => void loadCategories()} />
      ) : categories.length === 0 ? (
        <EmptyState message="Сейчас нет доступных видов SOS-помощи." />
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
                  {category.description ? (
                    <Text style={styles.cardDescription}>{category.description}</Text>
                  ) : null}
                </SectionCard>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {isTowTruck ? 'Откуда забрать автомобиль?' : 'Куда приехать?'}
      </Text>
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

      {isTowTruck ? (
        <>
          <Text style={styles.sectionTitle}>Куда доставить?</Text>
          <TextInput
            accessibilityLabel="Адрес доставки автомобиля"
            style={styles.input}
            value={destination}
            onChangeText={(value) => {
              setDestination(value);
              if (error) setError('');
            }}
            placeholder="Адрес СТО, стоянки или дома"
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        </>
      ) : null}

      <Text style={styles.sectionTitle}>Ваша цена (₸)</Text>
      <TextInput
        accessibilityLabel="Ваша цена"
        style={styles.input}
        value={price}
        onChangeText={(value) => {
          setPrice(value);
          if (error) setError('');
        }}
        placeholder="Например: 5000"
        keyboardType="numeric"
      />
      <Text style={[styles.mutedText, { fontSize: 12, marginTop: 7 }]}>
        Мастер может согласиться или предложить больше — но не дороже, чем на {MAX_OFFER_MARKUP.toLocaleString('ru-RU')} ₸.
      </Text>

      <Text style={styles.sectionTitle}>Автомобиль</Text>
      <Text style={[styles.mutedText, { marginBottom: 10, fontSize: 13 }]}>
        Необязательно, но мастеру проще, когда он знает марку, модель и год.
      </Text>
      <VehiclePicker value={vehicleId} onChange={setVehicleId} />

      {error ? <Text style={[styles.error, { marginTop: 14 }]}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        style={[styles.sosButton, (sending || !selectedSlug) && styles.disabledButton]}
        onPress={() => void submit()}
        disabled={sending || !selectedSlug}
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
