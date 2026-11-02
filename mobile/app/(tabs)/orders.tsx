import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Order } from '@shared/types/index';
import { ordersApi } from '../../src/api';
import { useAuthStore } from '../../src/store/authStore';
import { EmptyState, Page, SectionCard, styles } from '../../src/components/ui';
import { colors } from '../../src/theme';

const orderStatus: Record<Order['status'], string> = {
  open: 'Открыта',
  accepted: 'Принята',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

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

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const loadOrders = useCallback(async (pullToRefresh = false) => {
    setError('');
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setOrders(await ordersApi.list());
    } catch {
      setError('Не удалось загрузить заявки. Проверьте подключение и попробуйте ещё раз.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadOrders();
  }, [loadOrders]));

  return (
    <Page scroll={false}>
      <View style={styles.pageContent}>
        <Text style={styles.eyebrow}>AUTOMARKET</Text>
        <Text style={styles.pageTitle}>
          {user?.role === 'master' ? 'Заявки клиентов' : 'Мои заявки'}
        </Text>
        <Text style={[styles.mutedText, { marginBottom: 18 }]}>
          {user?.role === 'master'
            ? 'Открытые заявки — нажмите, чтобы предложить цену'
            : 'Текущий статус и предложения от мастеров'}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 36 }} color={colors.primary} />
      ) : error ? (
        <EmptyState message={error} actionLabel="Повторить" onAction={() => void loadOrders()} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={orders.length === 0 ? styles.emptyList : { padding: 20, paddingTop: 0, paddingBottom: 28 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <EmptyState
              message={
                user?.role === 'master'
                  ? 'Пока нет открытых заявок. Потяните вниз, чтобы обновить.'
                  : 'Заявок пока нет.'
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push({ pathname: '/order-detail', params: { id: item.id } })}>
              <SectionCard style={styles.listCard}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.mutedText, { marginTop: 2 }]}>
                      {item.service_type === 'sos' ? '🆘 Срочная помощь' : '📋 Плановое ТО'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.badge,
                      { backgroundColor: statusBg(item.status), color: statusColor(item.status) },
                    ]}
                  >
                    {orderStatus[item.status]}
                  </Text>
                </View>

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

                <View style={[styles.rowBetween, { marginTop: 10, alignItems: 'center' }]}>
                  {item.price_agreed != null ? (
                    <Text style={styles.price}>{Number(item.price_agreed).toLocaleString('ru-RU')} ₸</Text>
                  ) : (
                    <View />
                  )}

                  {/* CTA hint */}
                  {user?.role === 'master' && item.status === 'open' && (
                    <View style={{ backgroundColor: colors.accentBackground, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 12 }}>
                        💰 Предложить цену →
                      </Text>
                    </View>
                  )}
                  {user?.role === 'client' && item.status === 'open' && (
                    <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
                      <Text style={{ color: '#10b981', fontWeight: '700', fontSize: 12 }}>
                        Смотреть предложения →
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
