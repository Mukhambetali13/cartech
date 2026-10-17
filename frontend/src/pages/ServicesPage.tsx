import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { servicesApi } from '../api';
import type { Service, ServiceCategory } from '../types';

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const serviceType = searchParams.get('type') as 'sos' | 'planned' | null;
  const categorySlug = searchParams.get('category');

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesApi.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    servicesApi
      .list({
        service_type: serviceType || undefined,
        category_slug: categorySlug || undefined,
      })
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serviceType, categorySlug]);

  const filteredCategories = serviceType
    ? categories.filter((c) => c.service_type === serviceType)
    : categories;

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ marginBottom: 'var(--spacing-xl)' }}>Каталог услуг</h1>

        {/* Type filter */}
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
          <button
            id="filter-all"
            className={`btn btn-sm ${!serviceType ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { searchParams.delete('type'); searchParams.delete('category'); setSearchParams(searchParams); }}
          >
            Все услуги
          </button>
          <button
            id="filter-sos"
            className={`btn btn-sm ${serviceType === 'sos' ? 'btn-sos' : 'btn-ghost'}`}
            onClick={() => { searchParams.set('type', 'sos'); searchParams.delete('category'); setSearchParams(searchParams); }}
          >
            🆘 SOS / Выезд
          </button>
          <button
            id="filter-planned"
            className={`btn btn-sm ${serviceType === 'planned' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { searchParams.set('type', 'planned'); searchParams.delete('category'); setSearchParams(searchParams); }}
          >
            📋 Плановое ТО
          </button>
        </div>

        {/* Categories */}
        <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              id={`cat-${cat.slug}`}
              className="category-card"
              style={{
                background: categorySlug === cat.slug ? 'rgba(108,99,255,0.15)' : undefined,
                borderColor: categorySlug === cat.slug ? 'var(--color-primary)' : undefined,
              }}
              onClick={() => {
                if (categorySlug === cat.slug) {
                  searchParams.delete('category');
                } else {
                  searchParams.set('category', cat.slug);
                  searchParams.set('type', cat.service_type);
                }
                setSearchParams(searchParams);
              }}
            >
              <div className="category-icon">{cat.icon || '🔧'}</div>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Services List */}
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : services.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🔍</span>
            <p>Услуги не найдены. Попробуйте изменить фильтры.</p>
          </div>
        ) : (
          <div className="grid-3">
            {services.map((service) => {
              const cat = categories.find((c) => c.id === service.category_id);
              return (
                <div key={service.id} className="card">
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <div className="category-icon" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>
                      {cat?.icon || '🔧'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{service.title}</div>
                      {cat && (
                        <span className={`badge badge-${cat.service_type}`} style={{ fontSize: '0.65rem' }}>
                          {cat.service_type === 'sos' ? '🆘 SOS' : '📋 ТО'}
                        </span>
                      )}
                    </div>
                  </div>

                  {service.description && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)', lineHeight: 1.5 }}>
                      {service.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <div>
                      {service.price_from && (
                        <div className="price">
                          от {Number(service.price_from).toLocaleString()} ₽
                          {service.price_to && (
                            <span className="price-range"> — {Number(service.price_to).toLocaleString()} ₽</span>
                          )}
                        </div>
                      )}
                      {service.duration_minutes && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                          ~{service.duration_minutes} мин
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {service.is_mobile && (
                        <span className="tag">📍 Выезд</span>
                      )}
                      <Link to={`/orders/new?service_id=${service.id}`} className="btn btn-primary btn-sm">
                        Заказать
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
