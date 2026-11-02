import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { servicesApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { CreateServiceRequest, Service, ServiceCategory } from '../types';

const emptyService: CreateServiceRequest = {
  category_id: '',
  title: '',
  description: '',
  is_mobile: false,
};

export default function ServicesPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const isMyServices = location.pathname === '/services/my';
  const [searchParams, setSearchParams] = useSearchParams();
  const serviceType = searchParams.get('type') as 'sos' | 'planned' | null;
  const categorySlug = searchParams.get('category');
  const isMobile = searchParams.get('mobile');
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceForm, setServiceForm] = useState<CreateServiceRequest>(emptyService);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    servicesApi.categories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          setServiceForm((current) => ({
            ...current,
            category_id: current.category_id || data[0]?.id || '',
          }));
        }
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить категории услуг. Обновите страницу.');
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isMyServices && user?.role !== 'master') return;
    let cancelled = false;
    setLoading(true);
    setError('');
    const load = isMyServices
      ? servicesApi.myServices()
      : servicesApi.list({
          service_type: serviceType || undefined,
          category_slug: categorySlug || undefined,
          is_mobile: isMobile === null ? undefined : isMobile === 'true',
          min_price: minPrice ? Number(minPrice) : undefined,
          max_price: maxPrice ? Number(maxPrice) : undefined,
        });
    load
      .then((data) => { if (!cancelled) setServices(data); })
      .catch(() => { if (!cancelled) setError('Не удалось загрузить услуги. Проверьте подключение и попробуйте ещё раз.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [isMyServices, user?.role, serviceType, categorySlug, isMobile, minPrice, maxPrice]);

  if (isMyServices && user?.role !== 'master') {
    return <Navigate to="/services" replace />;
  }

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const handleCreateService = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const created = await servicesApi.create({
        ...serviceForm,
        title: serviceForm.title.trim(),
        description: serviceForm.description?.trim() || undefined,
        price_from: serviceForm.price_from == null ? undefined : Number(serviceForm.price_from),
        price_to: serviceForm.price_to == null ? undefined : Number(serviceForm.price_to),
        duration_minutes: serviceForm.duration_minutes == null ? undefined : Number(serviceForm.duration_minutes),
      });
      setServices((current) => [created, ...current]);
      setServiceForm({ ...emptyService, category_id: categories[0]?.id || '' });
      setShowForm(false);
    } catch {
      setError('Не удалось опубликовать услугу. Проверьте данные и попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = serviceType
    ? categories.filter((category) => category.service_type === serviceType)
    : categories;

  return (
    <div className="page">
      <div className="container">
        <div className="section-header" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div>
            <h1 style={{ color: 'var(--text-primary)' }}>
              {isMyServices ? 'Мои услуги' : 'Каталог услуг'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
              {isMyServices ? 'Публикуйте предложения, чтобы клиенты могли вас найти' : 'Подберите мастера по типу услуги, выезду и цене'}
            </p>
          </div>
          {user?.role === 'master' && (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              {!isMyServices && <Link to="/services/my" className="btn btn-ghost">Мои услуги</Link>}
              {isMyServices && (
                <button className="btn btn-primary" onClick={() => setShowForm((visible) => !visible)}>
                  {showForm ? 'Закрыть форму' : '+ Разместить услугу'}
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="alert alert-warning" role="alert" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {error}
          </div>
        )}

        {isMyServices && showForm && (
          <form className="card" onSubmit={handleCreateService} style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-lg)' }}>Новая услуга</h3>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="service-category">Категория</label>
                <select
                  id="service-category"
                  className="form-input"
                  value={serviceForm.category_id}
                  onChange={(event) => setServiceForm({ ...serviceForm, category_id: event.target.value })}
                  required
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="service-title">Название услуги</label>
                <input
                  id="service-title"
                  className="form-input"
                  value={serviceForm.title}
                  onChange={(event) => setServiceForm({ ...serviceForm, title: event.target.value })}
                  maxLength={255}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="service-description">Описание</label>
              <textarea
                id="service-description"
                className="form-input"
                rows={3}
                value={serviceForm.description}
                onChange={(event) => setServiceForm({ ...serviceForm, description: event.target.value })}
              />
            </div>
            <div className="grid-3">
              <div className="form-group">
                <label className="form-label" htmlFor="service-price-from">Цена от, ₸</label>
                <input id="service-price-from" className="form-input" type="number" min="0" step="1" value={serviceForm.price_from ?? ''} onChange={(event) => setServiceForm({ ...serviceForm, price_from: event.target.value === '' ? undefined : Number(event.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="service-price-to">Цена до, ₸</label>
                <input id="service-price-to" className="form-input" type="number" min="0" step="1" value={serviceForm.price_to ?? ''} onChange={(event) => setServiceForm({ ...serviceForm, price_to: event.target.value === '' ? undefined : Number(event.target.value) })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="service-duration">Длительность, минут</label>
                <input id="service-duration" className="form-input" type="number" min="1" step="1" value={serviceForm.duration_minutes ?? ''} onChange={(event) => setServiceForm({ ...serviceForm, duration_minutes: event.target.value === '' ? undefined : Number(event.target.value) })} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--spacing-lg)', color: 'var(--text-primary)' }}>
              <input type="checkbox" checked={serviceForm.is_mobile} onChange={(event) => setServiceForm({ ...serviceForm, is_mobile: event.target.checked })} />
              Выезжаю к клиенту
            </label>
            <button type="submit" className="btn btn-primary" disabled={saving || categories.length === 0}>
              {saving ? 'Публикация…' : 'Опубликовать услугу'}
            </button>
          </form>
        )}

        {!isMyServices && (
          <>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
              <button className={`btn btn-sm ${!serviceType ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { const next = new URLSearchParams(searchParams); next.delete('type'); next.delete('category'); setSearchParams(next); }}>Все услуги</button>
              <button className={`btn btn-sm ${serviceType === 'sos' ? 'btn-sos' : 'btn-ghost'}`} onClick={() => { const next = new URLSearchParams(searchParams); next.set('type', 'sos'); next.delete('category'); setSearchParams(next); }}>🆘 SOS / Выезд</button>
              <button className={`btn btn-sm ${serviceType === 'planned' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { const next = new URLSearchParams(searchParams); next.set('type', 'planned'); next.delete('category'); setSearchParams(next); }}>📋 Плановое ТО</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="service-filter-category">Категория</label>
                <select id="service-filter-category" className="form-input" value={categorySlug || ''} onChange={(event) => updateFilter('category', event.target.value)}>
                  <option value="">Все категории</option>
                  {filteredCategories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="service-filter-mobile">Выезд мастера</label>
                <select id="service-filter-mobile" className="form-input" value={isMobile || ''} onChange={(event) => updateFilter('mobile', event.target.value)}>
                  <option value="">Любой вариант</option>
                  <option value="true">С выездом</option>
                  <option value="false">В сервисе</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="service-filter-min-price">Цена от, ₸</label>
                <input id="service-filter-min-price" className="form-input" type="number" min="0" value={minPrice} onChange={(event) => updateFilter('min_price', event.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="service-filter-max-price">Цена до, ₸</label>
                <input id="service-filter-max-price" className="form-input" type="number" min="0" value={maxPrice} onChange={(event) => updateFilter('max_price', event.target.value)} />
              </div>
            </div>

            <div className="grid-4" style={{ marginBottom: 'var(--spacing-xl)' }}>
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  className="category-card"
                  style={{
                    background: categorySlug === category.slug ? 'rgba(108,99,255,0.15)' : undefined,
                    borderColor: categorySlug === category.slug ? 'var(--color-primary)' : undefined,
                  }}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    if (categorySlug === category.slug) {
                      next.delete('category');
                      next.delete('type');
                    } else {
                      next.set('category', category.slug);
                      next.set('type', category.service_type);
                    }
                    setSearchParams(next);
                  }}
                >
                  <div className="category-icon">{category.icon || '🔧'}</div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{category.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : services.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🔍</span>
            <p>{isMyServices ? 'У вас пока нет опубликованных услуг.' : 'Услуги не найдены. Измените фильтры или разместите первую услугу.'}</p>
          </div>
        ) : (
          <div className="grid-3">
            {services.map((service) => {
              const category = categories.find((item) => item.id === service.category_id);
              return (
                <div key={service.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <div className="category-icon" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>{category?.icon || '🔧'}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{service.title}</div>
                      {category && <span className={`badge badge-${category.service_type}`} style={{ fontSize: '0.65rem' }}>{category.service_type === 'sos' ? '🆘 SOS' : '📋 ТО'}</span>}
                    </div>
                  </div>
                  {service.master_name && (
                    <p style={{ color: 'var(--color-primary-light)', fontSize: '0.85rem', marginBottom: 'var(--spacing-sm)' }}>
                      Мастер: {service.master_company || service.master_name}
                    </p>
                  )}
                  {service.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--spacing-md)', lineHeight: 1.5 }}>{service.description}</p>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                    <div>
                      {service.price_from != null && <div className="price">от {Number(service.price_from).toLocaleString()} ₸{service.price_to != null && <span className="price-range"> — {Number(service.price_to).toLocaleString()} ₸</span>}</div>}
                      {service.duration_minutes != null && <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>~{service.duration_minutes} мин</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {service.is_mobile && <span className="tag">📍 Выезд</span>}
                      {user?.role === 'client' && <Link to={`/orders/new?service_id=${service.id}`} className="btn btn-primary btn-sm">Заказать</Link>}
                      {!user && <Link to="/login" className="btn btn-primary btn-sm">Войти, чтобы заказать</Link>}
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
