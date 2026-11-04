import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Order } from '@shared/types/index';
import { ordersApi } from '../../src/api';
import { useAuthStore } from '../../src/store/authStore';
import { ChipSelect, EmptyState, Page, SectionCard, styles } from '../../src/components/ui';
import { formatDate, vehicleSummary } from '../../src/maintenance';
import { localized, NUMBER_LOCALE, useLanguage, useT, type MessageKey } from '../../src/i18n';
import { shareMasterLocation } from '../../src/location';
import { colors } from '../../src/theme';

function statusColor(status: Order['status']) {
  const map: Record<string, string> = {
    open: '#10b981',
    accepted: '#6366f1',
    in_progress: '#f59e0b',
    completed: '#6b7280',
    cancelled: '#ef4444',
  };
  return map[status] ?? colors.primaryDark;
}

function statusBg(status: Order['status']) {
  const map: Record<string, string> = {
    open: 'rgba(16,185,129,0.12)',
    accepted: 'rgba(99,102,241,0.12)',
    in_progress: 'rgba(245,158,11,0.12)',
    completed: 'rgba(107,114,128,0.12)',
    cancelled: 'rgba(239,68,68,0.12)',
  };
  return map[status] ?? colors.accentBackground;
}

type TypeFilter = 'all' | 'sos' | 'planned';

const typeFilters: { value: TypeFilter; label: MessageKey }[] = [
  { value: 'all', label: 'orders.filterAll' },
  { value: 'sos', label: 'orders.filterSos' },
  { value: 'planned', label: 'orders.filterPlanned' },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const t = useT();
  const language = useLanguage();
  const isMaster = user?.role === 'master';

  const loadOrders = useCallback(async (pullToRefresh = false) => {
    setError('');
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // Сначала обновляем местоположение мастера, чтобы расстояния были свежими
      if (isMaster) await shareMasterLocation({ ask: true }).catch(() => undefined);
      setOrders(await ordersApi.list());
    } catch {
      setError(t('orders.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isMaster, t]);

  useFocusEffect(useCallback(() => {
    void loadOrders();
  }, [loadOrders]));

  const visibleOrders = typeFilter === 'all' ? orders : orders.filter((order) => order.service_type === typeFilter);

  return (
    <Page scroll={false}>
      <View style={styles.pageContent}>
        <Text style={styles.eyebrow}>AUTOMARKET</Text>
        <Text style={styles.pageTitle}>
          {isMaster ? t('orders.titleMaster') : t('orders.titleClient')}
        </Text>
        <Text style={[styles.mutedText, { marginBottom: 14 }]}>
          {isMaster ? t('orders.subtitleMaster') : t('orders.subtitleClient')}
        </Text>
        <View style={{ marginBottom: 14 }}>
          <ChipSelect
            options={typeFilters.map((option) => ({ value: option.value, label: t(option.label) }))}
            value={typeFilter} onChange={(value) => setTypeFilter(value ?? 'all')} />
        </View>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 36 }} color={colors.primary} />
      ) : error ? (
        <EmptyState message={error} actionLabel={t('common.retry')} onAction={() => void loadOrders()} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={visibleOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={visibleOrders.length === 0 ? styles.emptyList : { padding: 20, paddingTop: 0, paddingBottom: 28 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              message={isMaster ? t('orders.emptyMaster') : t('orders.emptyClient')}
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/order-detail', params: { id: item.id } })}>
              <SectionCard style={styles.listCard}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{localized(language, item.title, item.title_kk)}</Text>
                    <Text style={[styles.mutedText, { marginTop: 2 }]}>
                      {item.service_type === 'sos' ? t('order.typeSos') : t('order.typePlanned')}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.badge,
                      { backgroundColor: statusBg(item.status), color: statusColor(item.status) },
                    ]}
                  >
                    {t(`order.status.${item.status}`)}
                  </Text>
                </View>

                {item.vehicle_make ? (
                  <Text style={[styles.cardDescription, { marginTop: 6, color: colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    🚗 {vehicleSummary({
                      make: item.vehicle_make,
                      model: item.vehicle_model,
                      year: item.vehicle_year,
                    }).title}
                  </Text>
                ) : null}

                {item.scheduled_at ? (
                  <Text style={[styles.mutedText, { marginTop: 4, fontSize: 12 }]}>
                    {t('order.preferredDate', { date: formatDate(item.scheduled_at) })}
                  </Text>
                ) : null}

                {item.description ? (
                  <Text style={[styles.cardDescription, { marginTop: 6 }]} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}

                {item.address ? (
                  <Text style={[styles.mutedText, { marginTop: 5, fontSize: 12 }]} numberOfLines={1}>
                    📍 {item.address}
                  </Text>
                ) : null}

                {item.distance_km != null ? (
                  <Text style={[styles.mutedText, { marginTop: 4, fontSize: 12, fontWeight: '700', color: colors.primaryDark }]}>
                    {t('order.distance', { km: item.distance_km.toLocaleString(NUMBER_LOCALE, { maximumFractionDigits: 1 }) })}
                  </Text>
                ) : null}

                <View style={[styles.rowBetween, { marginTop: 10, alignItems: 'center' }]}>
                  {item.price_agreed != null ? (
                    <Text style={styles.price}>{Number(item.price_agreed).toLocaleString(NUMBER_LOCALE)} ₸</Text>
                  ) : item.client_price != null ? (
                    <Text style={[styles.price, { marginTop: 0 }]}>
                      {Number(item.client_price).toLocaleString(NUMBER_LOCALE)} ₸
                      <Text style={{ fontWeight: '500', fontSize: 12, color: colors.muted }}>
                        {isMaster ? t('order.clientPrice') : t('order.yourPrice')}
                      </Text>
                    </Text>
                  ) : (
                    <View />
                  )}

                  {/* CTA hint */}
                  {isMaster && item.status === 'open' && (
                    <View style={{ backgroundColor: colors.accentBackground, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 12 }}>
                        {t('orders.ctaOffer')}
                      </Text>
                    </View>
                  )}
                  {user?.role === 'client' && item.status === 'open' && (
                    <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 12 }}>
                        {t('orders.ctaOffers')}
                      </Text>
                    </View>
                  )}
                </View>
              </SectionCard>
            </Pressable>
          )}
        />
      )}
    </Page>
  );
}
