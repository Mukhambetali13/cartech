import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CreateVehicleRequest } from '@shared/types/index';
import { apiErrorMessage, vehiclesApi } from '../src/api';
import { BackButton, ChipSelect, Field, styles } from '../src/components/ui';
import { engineTypes, transmissions } from '../src/maintenance';
import { useT } from '../src/i18n';
import { colors } from '../src/theme';

interface FormState {
  make: string;
  model: string;
  year: string;
  plate_number: string;
  vin: string;
  color: string;
  engine_type: string | null;
  engine_volume: string;
  transmission: string | null;
  current_mileage: string;
  oil_type: string;
  tire_size: string;
  notes: string;
}

const emptyForm: FormState = {
  make: '',
  model: '',
  year: '',
  plate_number: '',
  vin: '',
  color: '',
  engine_type: null,
  engine_volume: '',
  transmission: null,
  current_mileage: '',
  oil_type: '',
  tire_size: '',
  notes: '',
};

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export default function VehicleFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const t = useT();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    vehiclesApi
      .get(id)
      .then((vehicle) =>
        setForm({
          make: vehicle.make,
          model: vehicle.model,
          year: String(vehicle.year),
          plate_number: vehicle.plate_number ?? '',
          vin: vehicle.vin ?? '',
          color: vehicle.color ?? '',
          engine_type: vehicle.engine_type ?? null,
          engine_volume: vehicle.engine_volume ?? '',
          transmission: vehicle.transmission ?? null,
          current_mileage: vehicle.current_mileage != null ? String(vehicle.current_mileage) : '',
          oil_type: vehicle.oil_type ?? '',
          tire_size: vehicle.tire_size ?? '',
          notes: vehicle.notes ?? '',
        }),
      )
      .catch((cause) => setError(apiErrorMessage(cause, t('vehicle.loadFailed'))))
      .finally(() => setLoading(false));
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (error) setError('');
  };

  const save = async () => {
    const year = Number(form.year);
    const currentYear = new Date().getFullYear();
    if (!form.make.trim() || !form.model.trim()) {
      setError(t('vehicleForm.makeModelRequired'));
      return;
    }
    if (!Number.isInteger(year) || year < 1950 || year > currentYear + 1) {
      setError(t('vehicleForm.yearInvalid', { max: currentYear + 1 }));
      return;
    }
    if (form.vin.trim() && form.vin.trim().length !== 17) {
      setError(t('vehicleForm.vinInvalid'));
      return;
    }

    // При редактировании пустая строка очищает поле; при создании поле просто не отправляем
    const optional = (value: string) => (isEdit ? value.trim() : value.trim() || undefined);
    const data: CreateVehicleRequest = {
      make: form.make.trim(),
      model: form.model.trim(),
      year,
      plate_number: optional(form.plate_number.toUpperCase()),
      vin: optional(form.vin.toUpperCase()),
      color: optional(form.color),
      engine_type: form.engine_type ?? (isEdit ? '' : undefined),
      engine_volume: optional(form.engine_volume.replace(',', '.')),
      transmission: form.transmission ?? (isEdit ? '' : undefined),
      current_mileage: form.current_mileage ? Number(form.current_mileage) : undefined,
      oil_type: optional(form.oil_type.toUpperCase()),
      tire_size: optional(form.tire_size.toUpperCase()),
      notes: optional(form.notes),
    };

    setSaving(true);
    try {
      if (id) await vehiclesApi.update(id, data);
      else await vehiclesApi.create(data);
      router.back();
    } catch (cause) {
      setError(apiErrorMessage(cause, t('vehicleForm.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.page, { justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
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
        <Text style={styles.eyebrow}>{t('vehicles.eyebrow')}</Text>
        <Text style={styles.pageTitle}>{isEdit ? t('vehicleForm.editTitle') : t('vehicleForm.newTitle')}</Text>
        <Text style={[styles.mutedText, { marginBottom: 8 }]}>
          {t('vehicleForm.intro')}
        </Text>

        <Text style={styles.sectionTitle}>{t('vehicleForm.basic')}</Text>
        <Field label={t('vehicleForm.make')}>
          <TextInput style={styles.input} value={form.make} onChangeText={(v) => set('make', v)} placeholder="Toyota" />
        </Field>
        <Field label={t('vehicleForm.model')}>
          <TextInput style={styles.input} value={form.model} onChangeText={(v) => set('model', v)} placeholder="Camry" />
        </Field>
        <View style={styles.rowGap}>
          <View style={{ flex: 1 }}>
            <Field label={t('vehicleForm.year')}>
              <TextInput
                style={styles.input}
                value={form.year}
                onChangeText={(v) => set('year', digitsOnly(v).slice(0, 4))}
                placeholder="2018"
                keyboardType="number-pad"
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('vehicle.plateLabel')}>
              <TextInput
                style={styles.input}
                value={form.plate_number}
                onChangeText={(v) => set('plate_number', v)}
                placeholder="123ABC02"
                autoCapitalize="characters"
              />
            </Field>
          </View>
        </View>
        <Field label={t('vehicleForm.vin')}>
          <TextInput
            style={styles.input}
            value={form.vin}
            onChangeText={(v) => set('vin', v.replace(/\s/g, '').slice(0, 17))}
            placeholder={t('vehicleForm.vinPlaceholder')}
            autoCapitalize="characters"
          />
        </Field>
        <Field label={t('vehicle.color')}>
          <TextInput style={styles.input} value={form.color} onChangeText={(v) => set('color', v)} placeholder={t('vehicleForm.colorPlaceholder')} />
        </Field>

        <Text style={styles.sectionTitle}>{t('vehicleForm.engineSection')}</Text>
        <Field label={t('vehicleForm.engineType')}>
          <ChipSelect options={engineTypes} value={form.engine_type} onChange={(v) => set('engine_type', v)} allowEmpty />
        </Field>
        <Field label={t('vehicleForm.engineVolume')}>
          <TextInput
            style={styles.input}
            value={form.engine_volume}
            onChangeText={(v) => set('engine_volume', v.replace(/[^\d.,]/g, '').slice(0, 4))}
            placeholder="2.5"
            keyboardType="decimal-pad"
          />
        </Field>
        <Field label={t('vehicleForm.gearbox')}>
          <ChipSelect options={transmissions} value={form.transmission} onChange={(v) => set('transmission', v)} allowEmpty />
        </Field>

        <Text style={styles.sectionTitle}>{t('vehicleForm.maintenance')}</Text>
        <Field label={t('vehicleForm.mileage')}>
          <TextInput
            style={styles.input}
            value={form.current_mileage}
            onChangeText={(v) => set('current_mileage', digitsOnly(v).slice(0, 7))}
            placeholder="85000"
            keyboardType="number-pad"
          />
        </Field>
        <Field label={t('vehicleForm.oil')}>
          <TextInput
            style={styles.input}
            value={form.oil_type}
            onChangeText={(v) => set('oil_type', v)}
            placeholder="5W-30, 4.5 л"
            autoCapitalize="characters"
          />
        </Field>
        <Field label={t('vehicleForm.tires')}>
          <TextInput
            style={styles.input}
            value={form.tire_size}
            onChangeText={(v) => set('tire_size', v)}
            placeholder="215/60 R16"
            autoCapitalize="characters"
          />
        </Field>
        <Field label={t('vehicle.notes')}>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            placeholder={t('vehicleForm.notesPlaceholder')}
            multiline
          />
        </Field>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, saving && styles.disabledButton]}
          disabled={saving}
          onPress={() => void save()}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{t('common.save')}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
