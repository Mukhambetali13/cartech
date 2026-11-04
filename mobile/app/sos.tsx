import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ServiceCategory } from '@shared/types/index';
import { MAX_OFFER_MARKUP } from '../src/pricing';
import { apiErrorMessage } from '../src/api/client';
import { ordersApi, servicesApi } from '../src/api';
import { useAuthStore } from '../src/store/authStore';
import { EmptyState, SectionCard, styles } from '../src/components/ui';
import { VehiclePicker } from '../src/components/VehiclePicker';
import { localized, NUMBER_LOCALE, useLanguage, useT } from '../src/i18n';
import { pickCurrentLocation, type PickedLocation } from '../src/location';
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
  const [location, setLocation] = useState<PickedLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const language = useLanguage();

  const loadCategories = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const all = await servicesApi.categories();
      setCategories(all.filter((category) => category.service_type === 'sos'));
    } catch (cause) {
      setLoadError(apiErrorMessage(cause, t('sos.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const isTowTruck = selectedSlug === TOW_TRUCK_SLUG;

  const detectLocation = async () => {
    setError('');
    setLocating(true);
    try {
      const picked = await pickCurrentLocation();
      if (!picked) {
        Alert.alert(t('location.denied'), undefined, [
          { text: 'OK', style: 'cancel' },
          { text: t('settings.open'), onPress: () => void Linking.openSettings() },
        ]);
        return;
      }
      setLocation(picked);
      setAddress(picked.address);
    } catch {
      setError(t('location.failed'));
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (user?.role !== 'client') {
      setError(t('sos.clientsOnly'));
      return;
    }
    const category = categories.find((item) => item.slug === selectedSlug);
    if (!category) {
      setError(t('sos.chooseHelp'));
      return;
    }
    if (!address.trim()) {
      setError(isTowTruck ? t('sos.pickupRequired') : t('sos.addressRequired'));
      return;
    }
    if (isTowTruck && !destination.trim()) {
      setError(t('sos.destinationRequired'));
      return;
    }

    const clientPrice = parseFloat(price.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(clientPrice) || clientPrice <= 0) {
      setError(t('price.required'));
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
        description: isTowTruck ? t('sos.destinationPrefix', { address: destination.trim() }) : undefined,
        address: address.trim(),
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      Alert.alert(t('sos.sentTitle'), t('sos.sentBody'), [
        { text: t('sos.viewOrder'), onPress: () => router.replace('/(tabs)/orders') },
      ]);
    } catch (cause) {
      setError(apiErrorMessage(cause, t('sos.sendFailed')));
    } finally {
      setSending(false);
    }
  };

  if (user?.role !== 'client') {
    return (
      <View style={[styles.page, { justifyContent: 'center', padding: 20 }]}>
        <EmptyState message={t('sos.clientsOnlyShort')} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, { paddingTop: styles.pageContent.paddingTop + insets.top }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>{t('sos.eyebrow')}</Text>
      <Text style={styles.pageTitle}>{t('sos.title')}</Text>
      <Text style={[styles.mutedText, { marginBottom: 20 }]}>
        {t('sos.intro')}
      </Text>

      <Text style={styles.sectionTitle}>{t('sos.whatHelp')}</Text>
      {loading ? (
        <ActivityIndicator style={{ marginVertical: 28 }} color={colors.primary} />
      ) : loadError ? (
        <EmptyState message={loadError} actionLabel={t('common.retry')} onAction={() => void loadCategories()} />
      ) : categories.length === 0 ? (
        <EmptyState message={t('sos.empty')} />
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

      <Text style={styles.sectionTitle}>
        {isTowTruck ? t('sos.pickupQuestion') : t('sos.whereQuestion')}
      </Text>
      <Pressable
        accessibilityRole="button"
        style={[styles.secondaryButton, { alignItems: 'center', marginBottom: 10 }, locating && styles.disabledButton]}
        disabled={locating}
        onPress={() => void detectLocation()}
      >
        {locating ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.secondaryButtonText}>{t('location.detect')}</Text>
        )}
      </Pressable>
      <TextInput
        accessibilityLabel={t('sos.addressA11y')}
        style={styles.input}
        value={address}
        onChangeText={(value) => {
          setAddress(value);
          if (error) setError('');
        }}
        placeholder={t('sos.addressPlaceholder')}
        autoCapitalize="sentences"
        returnKeyType="done"
      />
      <Text style={[styles.mutedText, { fontSize: 12, marginTop: 7 }]}>
        {location ? t('location.attached') : t('sos.addressExample')}
      </Text>

      {isTowTruck ? (
        <>
          <Text style={styles.sectionTitle}>{t('sos.destinationQuestion')}</Text>
          <TextInput
            accessibilityLabel={t('sos.destinationA11y')}
            style={styles.input}
            value={destination}
            onChangeText={(value) => {
              setDestination(value);
              if (error) setError('');
            }}
            placeholder={t('sos.destinationPlaceholder')}
            autoCapitalize="sentences"
            returnKeyType="done"
          />
        </>
      ) : null}

      <Text style={styles.sectionTitle}>{t('price.your')}</Text>
      <TextInput
        accessibilityLabel={t('price.your')}
        style={styles.input}
        value={price}
        onChangeText={(value) => {
          setPrice(value);
          if (error) setError('');
        }}
        placeholder={t('sos.pricePlaceholder')}
        keyboardType="numeric"
      />
      <Text style={[styles.mutedText, { fontSize: 12, marginTop: 7 }]}>
        {t('price.sosHint', { max: MAX_OFFER_MARKUP.toLocaleString(NUMBER_LOCALE) })}
      </Text>

      <Text style={styles.sectionTitle}>{t('common.vehicle')}</Text>
      <Text style={[styles.mutedText, { marginBottom: 10, fontSize: 13 }]}>
        {t('sos.vehicleHint')}
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
          <Text style={styles.sosButtonText}>{t('sos.send')}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
