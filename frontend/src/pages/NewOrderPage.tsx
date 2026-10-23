import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ordersApi, servicesApi, vehiclesApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { Service, ServiceType, Vehicle } from '../types';

export default function NewOrderPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service_id');
  const [service, setService] = useState<Service | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [serviceType, setServiceType] = useState<ServiceType>('planned');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      servicesApi.categories(),
      vehiclesApi.list(),
      serviceId ? servicesApi.get(serviceId) : Promise.resolve(null),
    ]).then(([categoryList, vehicleList, selectedService]) => {
      if (cancelled) return;
      setVehicles(vehicleList);
      setService(selectedService);
      if (selectedService) {
        setTitle(selectedService.title);
        const category = categoryList.find((item) => item.id === selectedService.category_id);
        if (category) setServiceType(category.service_type);
      }
      if (vehicleList.length) setVehicleId(vehicleList[0].id);
    }).catch(() => {
      if (!cancelled) setError('Не удалось загрузить данные для заявки. Попробуйте обновить страницу.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [serviceId]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await ordersApi.create({
        vehicle_id: vehicleId || undefined,
        service_id: service?.id,
        service_type: serviceType,
        title: title.trim(),
        description: description.trim() || undefined,
        address: address.trim() || undefined,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      });
      navigate('/orders');
    } catch {
      setError('Не удалось отправить заявку. Проверьте данные и попробуйте ещё раз.');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'client') {
    return (
      <div className="page">
        <div className="container empty-state">
          <h3>Заявки могут создавать клиенты</h3>
          <Link to="/services" className="btn btn-primary">Вернуться в каталог</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        <Link to={service ? '/services' : '/orders'} className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--spacing-lg)' }}>← Назад</Link>
        <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Создать заявку</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)' }}>
          {service ? `Заявка будет отправлена мастеру: ${service.master_company || service.master_name || 'по выбранной услуге'}.` : 'Опишите задачу — мастера смогут найти вашу заявку по типу услуги и статусу.'}
        </p>

        {error && <div className="alert alert-warning" role="alert" style={{ marginBottom: 'var(--spacing-lg)' }}>{error}</div>}
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : (
          <form className="card" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="order-service-type">Тип услуги</label>
              <select id="order-service-type" className="form-input" value={serviceType} disabled={Boolean(service)} onChange={(event) => setServiceType(event.target.value as ServiceType)}>
                <option value="planned">Плановое ТО</option>
                <option value="sos">Срочная помощь SOS</option>
              </select>
            </div>
            {service && (
              <div className="form-group">
                <label className="form-label" htmlFor="order-selected-service">Выбранная услуга</label>
                <input id="order-selected-service" className="form-input" value={service.title} readOnly />
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="order-title">Что нужно сделать</label>
              <input id="order-title" className="form-input" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required />
            </div>
            {vehicles.length > 0 && (
              <div className="form-group">
                <label className="form-label" htmlFor="order-vehicle">Автомобиль</label>
                <select id="order-vehicle" className="form-input" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
                  <option value="">Не указывать</option>
                  {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} ({vehicle.year})</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label" htmlFor="order-description">Описание</label>
              <textarea id="order-description" className="form-input" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="order-address">Адрес</label>
                <input id="order-address" className="form-input" value={address} onChange={(event) => setAddress(event.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="order-scheduled">Желаемое время</label>
                <input id="order-scheduled" className="form-input" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving || loading}>
              {saving ? 'Отправка…' : 'Отправить заявку'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
