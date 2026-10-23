import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import type { Order } from '@shared/types/index';
import { ordersApi } from '../../src/api';
import { EmptyState, Page, SectionCard, styles } from '../../src/components/ui';
import { colors } from '../../src/theme';

const orderStatus: Record<Order['status'], string> = {
  open: 'Открыт',
  accepted: 'Принят',
  in_progress: 'В работе',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async (pullToRefresh = false) => {
    setError('');
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setOrders(await ordersApi.list());
    } catch {
      setError('Не удалось загрузить заказы. Проверьте подключение и попробуйте ещё раз.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <Page scroll={false}>
      <View style={styles.pageContent}>
        <Text style={styles.eyebrow}>AUTOMARKET</Text>
        <Text style={styles.pageTitle}>Мои заказы</Text>
        <Text style={[styles.mutedText, { marginBottom: 18 }]}>История и текущий статус заказов</Text>
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
          contentContainerStyle={orders.length === 0 ? styles.emptyList : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={<EmptyState message="Заказов пока нет." />}
          renderItem={({ item }) => (
            <SectionCard style={styles.listCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.badge}>{orderStatus[item.status]}</Text>
              </View>
              <Text style={styles.mutedText}>{item.service_type === 'sos' ? 'Срочная помощь' : 'Плановая услуга'}</Text>
              {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
              {item.price_agreed != null ? (
                <Text style={styles.price}>{Number(item.price_agreed).toLocaleString('ru-RU')} ₽</Text>
              ) : null}
            </SectionCard>
          )}
        />
      )}
    </Page>
  );
}
