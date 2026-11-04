import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import type { Service } from '@shared/types/index';
import { servicesApi } from '../../src/api';
import { EmptyState, Page, SectionCard, styles } from '../../src/components/ui';
import { NUMBER_LOCALE, useT } from '../../src/i18n';
import { colors } from '../../src/theme';

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const t = useT();

  const loadServices = useCallback(async (pullToRefresh = false) => {
    setError('');
    if (pullToRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setServices(await servicesApi.list());
    } catch {
      setError(t('services.loadFailed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  return (
    <Page scroll={false}>
      <View style={styles.pageContent}>
        <Text style={styles.eyebrow}>AUTOMARKET</Text>
        <Text style={styles.pageTitle}>{t('services.title')}</Text>
        <Text style={[styles.mutedText, { marginBottom: 18 }]}>{t('services.subtitle')}</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 36 }} color={colors.primary} />
      ) : error ? (
        <EmptyState message={error} actionLabel={t('common.retry')} onAction={() => void loadServices()} />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={services}
          keyExtractor={(item) => item.id}
          contentContainerStyle={services.length === 0 ? styles.emptyList : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void loadServices(true)} tintColor={colors.primary} />
          }
          ListEmptyComponent={<EmptyState message={t('services.empty')} />}
          renderItem={({ item }) => (
            <SectionCard style={styles.listCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.badge}>{item.is_mobile ? t('services.mobile') : t('services.inShop')}</Text>
              </View>
              <Text style={styles.mutedText}>
                {item.master_company || item.master_name || t('services.defaultMaster')}
              </Text>
              {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
              <Text style={styles.price}>
                {item.price_from != null
                  ? t('services.priceFrom', { price: Number(item.price_from).toLocaleString(NUMBER_LOCALE) })
                  : t('services.priceNegotiable')}
                {item.price_to != null ? t('services.priceTo', { price: Number(item.price_to).toLocaleString(NUMBER_LOCALE) }) : ''}
              </Text>
            </SectionCard>
          )}
        />
      )}
    </Page>
  );
}
