import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import { MAX_OFFER_MARKUP } from '../src/pricing';
import { apiErrorMessage, offersApi, ordersApi } from '../src/api';
import { useAuthStore } from '../src/store/authStore';
import { SectionCard, styles as ui } from '../src/components/ui';
import { colors } from '../src/theme';
import { formatDate, formatKm, vehicleSummary } from '../src/maintenance';
import { localized, NUMBER_LOCALE, useLanguage, useT } from '../src/i18n';
import { mapUrl } from '../src/location';

const money = (value: number) => `${value.toLocaleString(NUMBER_LOCALE)} ₸`;

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
  const t = useT();
  const language = useLanguage();

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
      setError(apiErrorMessage(e, t('detail.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { void load(); }, [load]);

  const clientPrice = order?.client_price != null ? Number(order.client_price) : null;
  const maxOfferPrice = clientPrice != null ? clientPrice + MAX_OFFER_MARKUP : null;

  const submitOffer = async (fixedPrice?: number) => {
    Keyboard.dismiss();
    const price = fixedPrice ?? parseFloat(offerPrice.replace(/\s/g, '').replace(',', '.'));
    if (isNaN(price) || price <= 0) {
      setOfferError(t('offer.amountRequired'));
      return;
    }
    if (clientPrice != null && maxOfferPrice != null && (price < clientPrice || price > maxOfferPrice)) {
      setOfferError(t('offer.range', { min: money(clientPrice), max: money(maxOfferPrice) }));
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
      setOfferError(apiErrorMessage(e, t('offer.sendFailed')));
    } finally {
      setOfferSubmitting(false);
    }
  };

  const acceptOffer = async (offerId: string) => {
    Alert.alert(t('offer.acceptTitle'), t('offer.acceptBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('offer.accept'),
        style: 'default',
        onPress: async () => {
          try {
            await offersApi.accept(id!, offerId);
            await load();
          } catch (e) {
            Alert.alert(t('common.error'), apiErrorMessage(e, t('offer.acceptFailed')));
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
      Alert.alert(t('common.error'), apiErrorMessage(e, t('offer.declineFailed')));
    }
  };

  const updateStatus = async (status: string) => {
    setStatusUpdating(true);
    try {
      await ordersApi.updateStatus(id!, status);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), apiErrorMessage(e, t('detail.statusFailed')));
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
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.back')}</Text>
        </Pressable>
        <Text style={{ color: colors.error, fontSize: 15 }}>{error || t('detail.notFound')}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingTop: 20 + insets.top, paddingBottom: 40 }}>
        {/* Back */}
        <Pressable onPress={() => router.back()} style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 15 }}>{t('common.back')}</Text>
        </Pressable>

        {/* ── Order card ── */}
        <SectionCard style={{ marginBottom: 16 }}>
          <View style={[ui.rowBetween, { marginBottom: 8 }]}>
            <Text style={[ui.cardTitle, { flex: 1 }]}>{localized(language, order.title, order.title_kk)}</Text>
            <Text style={[ui.badge, statusBadgeStyle(order.status)]}>
              {t(`order.status.${order.status}`)}
            </Text>
          </View>
          <Text style={[ui.mutedText, { marginBottom: 4 }]}>
            {order.service_type === 'sos' ? t('order.typeSos') : t('order.typePlanned')}
          </Text>
          {order.description ? (
            <Text style={[ui.cardDescription, { marginTop: 6 }]}>{order.description}</Text>
          ) : null}
          {order.address ? (
            <Text style={[ui.mutedText, { marginTop: 6 }]}>📍 {order.address}</Text>
          ) : null}
          {order.distance_km != null ? (
            <Text style={[ui.mutedText, { marginTop: 4, fontWeight: '700', color: colors.primaryDark }]}>
              {t('order.distance', { km: order.distance_km.toLocaleString(NUMBER_LOCALE, { maximumFractionDigits: 1 }) })}
            </Text>
          ) : null}
          {order.latitude != null && order.longitude != null ? (
            <Pressable
              accessibilityRole="link"
              onPress={() => void Linking.openURL(mapUrl(order.latitude!, order.longitude!))}
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('detail.openMap')}</Text>
            </Pressable>
          ) : null}
          {order.scheduled_at ? (
            <Text style={[ui.mutedText, { marginTop: 6 }]}>{t('order.preferredDate', { date: formatDate(order.scheduled_at) })}</Text>
          ) : null}
          {order.price_agreed != null ? (
            <Text style={[ui.price, { marginTop: 10 }]}>
              {t('detail.agreedPrice', { price: money(Number(order.price_agreed)) })}
            </Text>
          ) : clientPrice != null ? (
            <Text style={[ui.price, { marginTop: 10 }]}>
              {t(isClient ? 'detail.yourPrice' : 'detail.clientPrice', { price: money(clientPrice) })}
            </Text>
          ) : null}
          <Text style={[ui.mutedText, { marginTop: 8, fontSize: 12 }]}>
            {new Date(order.created_at).toLocaleString(NUMBER_LOCALE)}
          </Text>
        </SectionCard>

        {/* ── Vehicle ── */}
        {order.vehicle_make ? (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>{t('detail.clientVehicle')}</Text>
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
              <Text style={ui.cardDescription}>{t('vehicles.mileage', { km: formatKm(order.vehicle_mileage) })}</Text>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── Master: status actions ── */}
        {isMaster && order.status === 'accepted' && order.master_id === user?.id && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>{t('detail.manage')}</Text>
            <Pressable
              style={[ui.primaryButton, { marginTop: 0 }]}
              disabled={statusUpdating}
              onPress={() => updateStatus('in_progress')}
            >
              <Text style={ui.primaryButtonText}>{t('detail.start')}</Text>
            </Pressable>
          </SectionCard>
        )}
        {isMaster && order.status === 'in_progress' && order.master_id === user?.id && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>{t('detail.manage')}</Text>
            <Pressable
              style={[ui.primaryButton, { marginTop: 0 }]}
              disabled={statusUpdating}
              onPress={() => updateStatus('completed')}
            >
              <Text style={ui.primaryButtonText}>{t('detail.finish')}</Text>
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
                Alert.alert(t('detail.cancelTitle'), t('detail.cancelBody'), [
                  { text: t('common.no'), style: 'cancel' },
                  { text: t('detail.cancelConfirm'), style: 'destructive', onPress: () => updateStatus('cancelled') },
                ])
              }
            >
              <Text style={s.cancelButtonText}>{t('detail.cancel')}</Text>
            </Pressable>
          </SectionCard>
        )}

        {/* ── Master: offer form ── */}
        {isMaster && isOpen && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>
              {myOffer ? t('offer.updateTitle') : t('offer.makeTitle')}
            </Text>

            {myOffer && (
              <View style={s.currentOffer}>
                <Text style={s.currentOfferLabel}>{t('offer.current')}</Text>
                <Text style={[ui.price, { marginTop: 0 }]}>
                  {Number(myOffer.price).toLocaleString(NUMBER_LOCALE)} ₸
                </Text>
                {myOffer.comment ? (
                  <Text style={ui.mutedText}>{myOffer.comment}</Text>
                ) : null}
              </View>
            )}

            {offerSent && !myOffer && (
              <Text style={s.successText}>{t('offer.sent')}</Text>
            )}

            {clientPrice != null && maxOfferPrice != null && (
              <>
                <Text style={[ui.mutedText, { marginBottom: 10 }]}>
                  {t('offer.clientOffers', { price: money(clientPrice), max: money(maxOfferPrice) })}
                </Text>
                <Pressable
                  style={[ui.primaryButton, { marginTop: 0, marginBottom: 14 }, offerSubmitting && ui.disabledButton]}
                  disabled={offerSubmitting}
                  onPress={() => void submitOffer(clientPrice)}
                >
                  <Text style={ui.primaryButtonText}>{t('offer.agree', { price: money(clientPrice) })}</Text>
                </Pressable>
              </>
            )}

            <Text style={s.fieldLabel}>{clientPrice != null ? t('offer.ownPrice') : t('offer.price')}</Text>
            <TextInput
              ref={priceRef}
              style={ui.input}
              placeholder={maxOfferPrice != null ? t('offer.upTo', { price: money(maxOfferPrice) }) : t('offer.pricePlaceholder')}
              placeholderTextColor={colors.muted}
              keyboardType="numeric"
              value={offerPrice}
              onChangeText={setOfferPrice}
              returnKeyType="next"
              onSubmitEditing={() => {}}
            />

            <Text style={[s.fieldLabel, { marginTop: 12 }]}>{t('offer.commentOptional')}</Text>
            <TextInput
              style={[ui.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder={t('offer.commentPlaceholder')}
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
                {offerSubmitting ? t('offer.sending') : myOffer ? t('offer.update') : t('offer.send')}
              </Text>
            </Pressable>
          </SectionCard>
        )}

        {/* ── Master: my offer status (closed order) ── */}
        {isMaster && !isOpen && myOffer && (
          <SectionCard style={{ marginBottom: 16 }}>
            <Text style={s.sectionHead}>{t('offer.mine')}</Text>
            <View style={ui.rowBetween}>
              <Text style={[ui.badge, offerBadgeStyle(myOffer.status)]}>
                {t(`offer.status.${myOffer.status}`)}
              </Text>
              <Text style={ui.price}>{Number(myOffer.price).toLocaleString(NUMBER_LOCALE)} ₸</Text>
            </View>
            {myOffer.comment ? <Text style={[ui.mutedText, { marginTop: 6 }]}>{myOffer.comment}</Text> : null}
          </SectionCard>
        )}

        {/* ── Client: accepted offer pinned ── */}
        {isClient && acceptedOffer && (
          <SectionCard style={[{ marginBottom: 16, borderColor: '#10b981', borderWidth: 2 }]}>
            <Text style={s.sectionHead}>{t('offer.chosenMaster')}</Text>
            <View style={ui.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={ui.cardTitle}>{acceptedOffer.master_name || t('offer.master')}</Text>
                {acceptedOffer.master_company ? (
                  <Text style={ui.mutedText}>🏢 {acceptedOffer.master_company}</Text>
                ) : null}
                <Stars value={acceptedOffer.master_rating} />
              </View>
              <Text style={[ui.price, { fontSize: 18 }]}>
                {Number(acceptedOffer.price).toLocaleString(NUMBER_LOCALE)} ₸
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
                {t('offer.list')}
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
                    {t('offer.none')}
                  </Text>
                </View>
              </SectionCard>
            )}

            {pendingOffers.map((offer) => (
              <SectionCard key={offer.id} style={{ marginBottom: 10 }}>
                <View style={ui.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={ui.cardTitle}>{offer.master_name || t('offer.master')}</Text>
                    {offer.master_company ? (
                      <Text style={[ui.mutedText, { marginTop: 2 }]}>🏢 {offer.master_company}</Text>
                    ) : null}
                    <Stars value={offer.master_rating} />
                    {offer.master_review_count != null && offer.master_review_count > 0 && (
                      <Text style={[ui.mutedText, { fontSize: 12 }]}>
                        {t('offer.reviews', { count: offer.master_review_count })}
                      </Text>
                    )}
                    {offer.comment ? (
                      <Text style={[ui.cardDescription, { marginTop: 6 }]}>💬 {offer.comment}</Text>
                    ) : null}
                    <Text style={[ui.mutedText, { fontSize: 12, marginTop: 6 }]}>
                      {new Date(offer.created_at).toLocaleString(NUMBER_LOCALE)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text style={[ui.price, { fontSize: 16 }]}>
                      {money(Number(offer.price))}
                    </Text>
                    {clientPrice != null && (
                      <Text style={[ui.mutedText, { fontSize: 12, marginTop: 2 }]}>
                        {Number(offer.price) > clientPrice
                          ? t('offer.aboveYours', { diff: money(Number(offer.price) - clientPrice) })
                          : t('offer.atYours')}
                      </Text>
                    )}
                  </View>
                </View>

                {isOpen && (
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <Pressable
                      style={[s.acceptButton, { flex: 1 }]}
                      onPress={() => void acceptOffer(offer.id)}
                    >
                      <Text style={s.acceptButtonText}>{t('offer.acceptButton')}</Text>
                    </Pressable>
                    <Pressable
                      style={[s.declineButton, { flex: 1 }]}
                      onPress={() => void declineOffer(offer.id)}
                    >
                      <Text style={s.declineButtonText}>{t('offer.declineButton')}</Text>
                    </Pressable>
                  </View>
                )}
              </SectionCard>
            ))}

            {/* Declined offers */}
            {declinedOffers.length > 0 && (
              <Text style={[ui.mutedText, { textAlign: 'center', marginTop: 6, fontSize: 13 }]}>
                {t('offer.declinedCount', { count: declinedOffers.length })}
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
