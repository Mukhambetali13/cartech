import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Vehicle } from '@shared/types/index';
import { apiErrorMessage, serviceBookApi, vehiclesApi } from '../src/api';
import { BackButton, ChipSelect, Field, styles } from '../src/components/ui';
import { addMonths, formatDate, parseDate, toApiDate, workType, workTypes } from '../src/maintenance';
import { colors } from '../src/theme';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export default function ServiceEntryScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [type, setType] = useState('oil_change');
  const [title, setTitle] = useState(workType('oil_change').label);
  const [date, setDate] = useState(formatDate(new Date()));
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [description, setDescription] = useState('');
  const [nextMileage, setNextMileage] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!vehicleId) return;
    vehiclesApi
      .get(vehicleId)
      .then((loaded) => {
        setVehicle(loaded);
        if (loaded.current_mileage) setMileage(String(loaded.current_mileage));
      })
      .catch(() => undefined);
  }, [vehicleId]);

  // Подставляем рекомендуемую следующую замену по интервалу выбранной работы
  useEffect(() => {
    const work = workType(type);
    const km = Number(mileage);
    setNextMileage(work.intervalKm && km > 0 ? String(km + work.intervalKm) : '');
    const serviced = parseDate(date);
    setNextDate(work.intervalMonths && serviced ? formatDate(addMonths(serviced, work.intervalMonths)) : '');
  }, [type, mileage, date]);

  const chooseType = (value: string | null) => {
    if (!value) return;
    setType(value);
    setTitle(workType(value).label);
    setError('');
  };

  const save = async () => {
    const serviced = parseDate(date);
    const km = Number(mileage);
    if (!title.trim()) {
      setError('Укажите название работы.');
      return;
    }
    if (!serviced || serviced > new Date()) {
      setError('Укажите дату работы в формате ДД.ММ.ГГГГ (не в будущем).');
      return;
    }
    if (!mileage || km <= 0) {
      setError('Укажите пробег на момент работы.');
      return;
    }
    const next = nextDate.trim() ? parseDate(nextDate) : null;
    if (nextDate.trim() && !next) {
      setError('Дата следующей замены — в формате ДД.ММ.ГГГГ.');
      return;
    }
    if (nextMileage && Number(nextMileage) <= km) {
      setError('Пробег следующей замены должен быть больше текущего.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      // Время 12:00, чтобы дата не съехала из-за часового пояса
      serviced.setHours(12);
      await serviceBookApi.add(vehicleId!, {
        entry_type: type,
        title: title.trim(),
        description: description.trim() || undefined,
        mileage_at_service: km,
        next_service_mileage: nextMileage ? Number(nextMileage) : undefined,
        next_service_date: next ? toApiDate(next) : undefined,
        cost: cost ? Number(cost) : undefined,
        serviced_at: serviced.toISOString(),
      });
      router.back();
    } catch (cause) {
      setError(apiErrorMessage(cause, 'Не удалось сохранить запись.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.pageContent, { paddingTop: styles.pageContent.paddingTop + insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton onPress={() => router.back()} />
        <Text style={styles.eyebrow}>СЕРВИСНАЯ КНИЖКА</Text>
        <Text style={styles.pageTitle}>Запись о работе</Text>
        {vehicle ? (
          <Text style={styles.mutedText}>
            {vehicle.make} {vehicle.model}, {vehicle.year}
          </Text>
        ) : null}

        <Text style={styles.sectionTitle}>Что сделали?</Text>
        <ChipSelect
          options={workTypes.map((work) => ({ value: work.type, label: `${work.icon} ${work.label}` }))}
          value={type}
          onChange={chooseType}
        />

        <View style={{ marginTop: 18 }}>
          <Field label="Название">
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Замена масла ДВС" />
          </Field>
          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <Field label="Дата *">
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="ДД.ММ.ГГГГ"
                  keyboardType="numbers-and-punctuation"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Пробег, км *">
                <TextInput
                  style={styles.input}
                  value={mileage}
                  onChangeText={(v) => setMileage(digitsOnly(v).slice(0, 7))}
                  placeholder="85000"
                  keyboardType="number-pad"
                />
              </Field>
            </View>
          </View>
          <Field label="Стоимость, ₸">
            <TextInput
              style={styles.input}
              value={cost}
              onChangeText={(v) => setCost(digitsOnly(v).slice(0, 9))}
              placeholder="25000"
              keyboardType="number-pad"
            />
          </Field>
          <Field label="Комментарий">
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Масло Mobil 5W-30, фильтр Mann W 712/75, СТО на Абая"
              multiline
            />
          </Field>
        </View>

        <Text style={styles.sectionTitle}>Когда следующая замена?</Text>
        <Text style={[styles.mutedText, { marginBottom: 12 }]}>
          Подставили рекомендуемый интервал — поправьте под свою машину. Напомним, когда подойдёт срок.
        </Text>
        <View style={styles.rowGap}>
          <View style={{ flex: 1 }}>
            <Field label="На пробеге, км">
              <TextInput
                style={styles.input}
                value={nextMileage}
                onChangeText={(v) => setNextMileage(digitsOnly(v).slice(0, 7))}
                placeholder="95000"
                keyboardType="number-pad"
              />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Или до даты">
              <TextInput
                style={styles.input}
                value={nextDate}
                onChangeText={setNextDate}
                placeholder="ДД.ММ.ГГГГ"
                keyboardType="numbers-and-punctuation"
              />
            </Field>
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          style={[styles.primaryButton, saving && styles.disabledButton]}
          disabled={saving}
          onPress={() => void save()}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Сохранить запись</Text>}
        </Pressable>
        <Text style={[styles.mutedText, { fontSize: 12, marginTop: 10, color: colors.muted }]}>
          Пробег автомобиля обновится автоматически, если он больше текущего.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
