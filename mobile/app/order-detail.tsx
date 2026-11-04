import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Order, OrderOfferWithMaster } from '@shared/types/index';
import { apiErrorMessage, offersApi, ordersApi } from '../src/api';
import { useAuthStore } from '../src/store/authStore';
import { SectionCard, styles as ui } from '../src/components/ui';
import { colors } from '../src/theme';
import { formatDate, formatKm, vehicleSummary } from '../src/maintenance';

const statusLabel: Record<string, string> = {
  open: 'Открыта',
  accepted: 'Принята',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

const offerStatusLabel: Record<string, string> = {
  pending: 'Ожидает',
  accepted: '✅ Принято',
  declined: '✕ Отклонено',
};

function Stars({ value }: { value?: number | null }) {
  if (!value) return null;
  const filled = Math.round(Number(value));
  return (
    <Text style={{ color: '#f59e0b', fontSize: 13, marginTop: 2 }}>
      {'★'.repeat(filled)}{'☆'.repeat(5 - filled)}
      {'  '}{Number(value).toFixed(1)}
    </Text>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const [order, setOrder] = useState<Order | null>(null);
  const [offers, setOffers] = useState<OrderOfferWithMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Offer form
  const [offerPrice, setOfferPrice] = useState('');
  const [offerComment, setOfferComment] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerSent, setOfferSent] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState(false);

  const priceRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError('');
    try {
      const [o, ofs] = await Promise.all([ordersApi.get(id), offersApi.list(id)]);
      setOrder(o);
      setOffers(ofs);
    } catch (e) {
      setError(apiErrorMessage(e, 'Не удалось загрузить данные'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  const submitOffer = async () => {
    Keyboard.dismiss();
    const price = parseFloat(offerPrice.replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      setOfferError('Введите сумму больше нуля');
      return;
    }
    setOfferSubmitting(true);
    setOfferError('');
    try {
      await offersApi.create(id!, {
        price,
        comment: offerComment.trim() || undefined,
      });
      setOfferSent(true);
      setOfferPrice('');
      setOfferComment('');
      await load();
    } catch (e) {
      setOfferError(apiErrorMessage(e, 'Не удалось отправить предложение'));
    } finally {
      setOfferSubmitting(false);
    }
  };

  const acceptOffer = async (offerId: string) => {
    Alert.alert('Принять предложение?', 'Вы выберете этого мастера и заявка будет передана ему.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Принять',
        style: 'default',
        onPress: async () => {
          try {
            await offersApi.accept(id!, offerId);
            await load();
          } catch (e) {
            Alert.alert('Ошибка', apiErrorMessage(e, 'Не удалось принять предложение'));
          }
        },
      },
    ]);
  };

  const declineOffer = async (offerId: string) => {
    try {
      await offersApi.decline(id!, offerId);
      await load();
    } catch (e) {
      Alert.alert('Ошибка', apiErrorMessage(e, 'Не удалось отклонить предложение'));
    }
  };

  const updateStatus = async (status: string) => {
    setStatusUpdating(true);
    try {
      await ordersApi.updateStatus(id!, status);
      await load();
    } catch (e) {
      Alert.alert('Ошибка', apiErrorMessage(e, 'Не удалось изменить статус'));
    } finally {
      setStatusUpdating(false);
    }
  };

  const isMaster = user?.role === 'master';
  const isClient = user?.role === 'client';
  const isOpen = order?.status === 'open';

  const myOffer = isMaster ? offers.find((o) => o.master_id === user?.id) : null;
  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const acceptedOffer = offers.find((o) => o.status === 'accepted');
  const declinedOffers = offers.filter((o) => o.status === 'declined');

  if (loading) {
    return (
      <View style={[s.page, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={[s.page, { padding: 24, paddingTop: 24 + insets.top }]}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>← Назад</Text>
        </Pressable>
        <Text style={{ color: colors.error, fontSize: 15 }}>{error || 'Заявка не найдена'}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 20 + insets.top, paddingBottom: 40 }}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>← Назад</Text>
        </Pressable>

        {/* ── Order card ── */}
        <SectionCard style={{ marginBottom: 16 }}>
          <View style={[ui.rowBetween, { marginBottom: 8 }]}>
            <Text style={[ui.cardTitle, { flex: 1 }]}>{order.title}</Text>
            <Text style={[ui.badge, statusBadgeStyle(order.status)]}>
              {statusLabel[order.status]}
            </Text>
          </View>
          <Text style={[ui.mutedText, { marginBottom: 4 }]}>
            {order.service_type === 'sos' ? '🆘 Срочная помощь' : '📋 Плановое ТО'}
          </Text>
          {order.description ? (
            <Text style={[ui.cardDescription, { marginTop: 6 }]}>{order.description}</Text>
          ) : null}
          {order.address ? (
            <Text style={[ui.mutedText, { marginTop: 6 }]}>📍 {order.address}</Text>
          ) : null}
          {order.scheduled_at ? (
            <Text style={[ui.mutedText, { marginTop: 6 }]}>📅 Желаемая дата: {formatDate(order.scheduled_at)}</Text>
          ) : null}
          {order.price_agreed != null ? (
            <Text style={[ui.price, { marginTop: 10 }]}>
              {Number(order.price_agreed).toLocaleString('ru-RU')} ₸  — согласованная цена
            </Text>
          ) : null}
          <Text style={[ui.mutedText, { marginTop: 8, fontSize: 12 }]}>
            {new Date(order.created_at).toLocaleString('ru-RU')}
          </Text>
        </SectionCard>

        {/* ── Vehicle ── */}
        {order.vehicle_make ? (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>🚗 Автомобиль клиента</Text>
            <Text style={ui.cardTitle}>
              {vehicleSummary({ make: order.vehicle_make, model: order.vehicle_model, year: order.vehicle_year }).title}
            </Text>
            {(() => {
              const details = vehicleSummary({
                engine_volume: order.vehicle_engine_volume,
                engine_type: order.vehicle_engine_type,
                transmission: order.vehicle_transmission,
              }).details;
              return details ? <Text style={ui.cardDescription}>{details}</Text> : null;
            })()}
            {order.vehicle_mileage != null ? (
              <Text style={ui.cardDescription}>Пробег: {formatKm(order.vehicle_mileage)}</Text>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── Master: status actions ── */}
        {isMaster && order.status === 'accepted' && order.master_id === user?.id && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>Управление заявкой</Text>
            <Pressable
              style={[ui.primaryButton, { marginTop: 0 }]}
              disabled={statusUpdating}
              onPress={() => updateStatus('in_progress')}
            >
              <Text style={ui.primaryButtonText}>🔧 Начать работу</Text>
            </Pressable>
          </SectionCard>
        )}
        {isMaster && order.status === 'in_progress' && order.master_id === user?.id && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>Управление заявкой</Text>
            <Pressable
              style={[ui.primaryButton, { marginTop: 0 }]}
              disabled={statusUpdating}
              onPress={() => updateStatus('completed')}
            >
              <Text style={ui.primaryButtonText}>✅ Завершить работу</Text>
            </Pressable>
          </SectionCard>
        )}

        {/* ── Client: cancel ── */}
        {isClient && ['open', 'accepted'].includes(order.status) && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Pressable
              style={s.cancelButton}
              disabled={statusUpdating}
              onPress={() =>
                Alert.alert('Отменить заявку?', 'Это действие нельзя отменить.', [
                  { text: 'Нет', style: 'cancel' },
                  { text: 'Да, отменить', style: 'destructive', onPress: () => updateStatus('cancelled') },
                ])
              }
            >
              <Text style={s.cancelButtonText}>✕ Отменить заявку</Text>
            </Pressable>
          </SectionCard>
        )}

        {/* ── Master: offer form ── */}
        {isMaster && isOpen && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>
              {myOffer ? '✏️ Обновить предложение' : '💰 Предложить цену'}
            </Text>

            {myOffer && (
              <View style={s.currentOffer}>
                <Text style={s.currentOfferLabel}>Ваше текущее предложение:</Text>
                <Text style={[ui.price, { marginTop: 0 }]}>
                  {Number(myOffer.price).toLocaleString('ru-RU')} ₸
                </Text>
                {myOffer.comment ? (
                  <Text style={ui.mutedText}>{myOffer.comment}</Text>
                ) : null}
              </View>
            )}

            {offerSent && !myOffer && (
              <Text style={s.successText}>✅ Предложение отправлено! Ожидайте ответа клиента.</Text>
            )}

            <Text style={s.fieldLabel}>Цена (₸) *</Text>
            <TextInput
              ref={priceRef}
              style={ui.input}
              placeholder="Например: 2500"
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={offerPrice}
              onChangeText={setOfferPrice}
              returnKeyType="next"
              onSubmitEditing={() => {}}
            />

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>Комментарий (необязательно)</Text>
            <TextInput
              style={[ui.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Что входит в стоимость, сроки..."
              placeholderTextColor={colors.muted}
              multiline
              value={offerComment}
              onChangeText={setOfferComment}
            />

            {offerError ? <Text style={ui.error}>{offerError}</Text> : null}

            <Pressable
              style={[ui.primaryButton, offerSubmitting && ui.disabledButton]}
              disabled={offerSubmitting}
              onPress={() => void submitOffer()}
            >
              <Text style={ui.primaryButtonText}>
                {offerSubmitting ? 'Отправка...' : myOffer ? '🔄 Обновить' : '📤 Отправить предложение'}
              </Text>
            </Pressable>
          </SectionCard>
        )}

        {/* ── Master: my offer status (closed order) ── */}
        {isMaster && !isOpen && myOffer && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>Моё предложение</Text>
            <View style={ui.rowBetween}>
              <Text style={[ui.badge, offerBadgeStyle(myOffer.status)]}>
                {offerStatusLabel[myOffer.status]}
              </Text>
              <Text style={ui.price}>{Number(myOffer.price).toLocaleString('ru-RU')} ₸</Text>
            </View>
            {myOffer.comment ? <Text style={[ui.mutedText, { marginTop: 6 }]}>{myOffer.comment}</Text> : null}
          </SectionCard>
        )}

        {/* ── Client: accepted offer pinned ── */}
        {isClient && acceptedOffer && (
          <SectionCard style={[{ marginBottom: 16, borderColor: '#10b981', borderWidth: 2 }]}>
            <Text style={s.sectionHead}>✅ Выбранный мастер</Text>
            <View style={ui.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={ui.cardTitle}>{acceptedOffer.master_name || 'Мастер'}</Text>
                {acceptedOffer.master_company ? (
                  <Text style={ui.mutedText}>🏢 {acceptedOffer.master_company}</Text>
                ) : null}
                <Stars value={acceptedOffer.master_rating} />
              </View>
              <Text style={[ui.price, { fontSize: 18 }]}>
                {Number(acceptedOffer.price).toLocaleString('ru-RU')} ₸
              </Text>
            </View>
            {acceptedOffer.comment ? (
              <Text style={[ui.cardDescription, { marginTop: 8 }]}>💬 {acceptedOffer.comment}</Text>
            ) : null}
          </SectionCard>
        )}

        {/* ── Client: pending offers list ── */}
        {isClient && (
          <>
            <View style={[ui.rowBetween, { marginBottom: 10 }]}>
              <Text style={s.sectionHead}>
                Предложения мастеров
              </Text>
              {pendingOffers.length > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{pendingOffers.length}</Text>
                </View>
              )}
            </View>

            {pendingOffers.length === 0 && !acceptedOffer && (
              <SectionCard style={{ marginBottom: 12 }}>
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Text style={{ fontSize: 28, marginBottom: 8 }}>⏳</Text>
                  <Text style={[ui.mutedText, { textAlign: 'center' }]}>
                    Мастера пока не откликнулись. Заявка видна всем мастерам в вашей категории.
                  </Text>
                </View>
              </SectionCard>
            )}

            {pendingOffers.map((offer) => (
              <SectionCard key={offer.id} style={{ marginBottom: 10 }}>
                <View style={ui.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={ui.cardTitle}>{offer.master_name || 'Мастер'}</Text>
                    {offer.master_company ? (
                      <Text style={[ui.mutedText, { marginTop: 2 }]}>🏢 {offer.master_company}</Text>
                    ) : null}
                    <Stars value={offer.master_rating} />
                    {offer.master_review_count != null && offer.master_review_count > 0 && (
                      <Text style={[ui.mutedText, { fontSize: 12 }]}>
                        {offer.master_review_count} отзывов
                      </Text>
                    )}
                    {offer.comment ? (
                      <Text style={[ui.cardDescription, { marginTop: 6 }]}>💬 {offer.comment}</Text>
                    ) : null}
                    <Text style={[ui.mutedText, { fontSize: 12, marginTop: 6 }]}>
                      {new Date(offer.created_at).toLocaleString('ru-RU')}
                    </Text>
                  </View>
                  <Text style={[ui.price, { fontSize: 16, flexShrink: 0 }]}>
                    {Number(offer.price).toLocaleString('ru-RU')} ₸
                  </Text>
                </View>

                {isOpen && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Pressable
                      style={[s.acceptButton, { flex: 1 }]}
                      onPress={() => void acceptOffer(offer.id)}
                    >
                      <Text style={s.acceptButtonText}>✅ Принять</Text>
                    </Pressable>
                    <Pressable
                      style={[s.declineButton, { flex: 1 }]}
                      onPress={() => void declineOffer(offer.id)}
                    >
                      <Text style={s.declineButtonText}>✕ Отклонить</Text>
                    </Pressable>
                  </View>
                )}
              </SectionCard>
            ))}

            {/* Declined offers */}
            {declinedOffers.length > 0 && (
              <Text style={[ui.mutedText, { textAlign: 'center', marginTop: 6, fontSize: 13 }]}>
                Отклонено предложений: {declinedOffers.length}
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function statusBadgeStyle(status: string) {
  const map: Record<string, object> = {
    open: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' },
    accepted: { backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' },
    in_progress: { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    completed: { backgroundColor: 'rgba(107,114,128,0.12)', color: '#6b7280' },
    cancelled: { backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  };
  return map[status] ?? {};
}

function offerBadgeStyle(status: string) {
  const map: Record<string, object> = {
    pending: { backgroundColor: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    accepted: { backgroundColor: 'rgba(16,185,129,0.12)', color: '#10b981' },
    declined: { backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444' },
  };
  return map[status] ?? {};
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  sectionHead: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 },
  fieldLabel: { color: colors.text, fontSize: 14, fontWeight: '600', marginBottom: 7 },
  currentOffer: {
    backgroundColor: colors.accentBackground,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 4,
  },
  currentOfferLabel: { color: colors.secondaryText, fontSize: 13 },
  successText: {
    color: '#10b981',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 10,
    padding: 11,
    marginBottom: 12,
    fontSize: 13,
  },
  cancelButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    backgroundColor: 'rgba(239,68,68,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  acceptButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  declineButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
    backgroundColor: 'rgba(239,68,68,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: { color: '#ef4444', fontWeight: '700', fontSize: 14 },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
