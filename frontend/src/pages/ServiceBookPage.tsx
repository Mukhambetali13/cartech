import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { serviceBookApi, vehiclesApi } from '../api';
import type { ServiceBookSummary, Vehicle, Reminder } from '../types';

const entryTypeLabels: Record<string, { icon: string; label: string }> = {
  oil_change:   { icon: '🛢️', label: 'Замена масла' },
  filter:       { icon: '🌬️', label: 'Замена фильтра' },
  brake_pads:   { icon: '🛑', label: 'Тормозные колодки' },
  brake_discs:  { icon: '💿', label: 'Тормозные диски' },
  spark_plugs:  { icon: '✨', label: 'Свечи зажигания' },
  tire_change:  { icon: '🔄', label: 'Шиномонтаж' },
  diagnostics:  { icon: '💻', label: 'Диагностика' },
  other:        { icon: '🔧', label: 'Другое' },
};

export default function ServiceBookPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [book, setBook] = useState<ServiceBookSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!vehicleId) return;
    try {
      const [v, b] = await Promise.all([
        vehiclesApi.get(vehicleId),
        serviceBookApi.get(vehicleId),
      ]);
      setVehicle(v);
      setBook(b);
    } catch {
      navigate('/vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  const handleDismissReminder = async (reminder: Reminder) => {
    if (!vehicleId) return;
    await serviceBookApi.dismissReminder(vehicleId, reminder.id);
    setBook((prev) =>
      prev
        ? { ...prev, active_reminders: prev.active_reminders.filter((r) => r.id !== reminder.id) }
        : prev
    );
  };

  if (loading) return <div className="loader"><div className="spinner" /></div>;
  if (!vehicle || !book) return null;

  return (
    <div className="page">
      <div className="container">
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--spacing-md)' }} onClick={() => navigate(-1)}>
          ← Назад
        </button>

        {/* Vehicle Header */}
        <div
          className="card card-gradient"
          style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}
        >
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: 4 }}>
              📖 {vehicle.make} {vehicle.model}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              {vehicle.year} г. · {vehicle.plate_number || 'Номер не указан'}
            </p>
          </div>
          <div className="vehicle-stats">
            {vehicle.current_mileage != null && (
              <div className="vehicle-stat">
                <span className="vehicle-stat-label">Текущий пробег</span>
                <span className="vehicle-stat-value" style={{ fontSize: '1.2rem' }}>
                  {vehicle.current_mileage.toLocaleString()} км
                </span>
              </div>
            )}
            <div className="vehicle-stat">
              <span className="vehicle-stat-label">Записей</span>
              <span className="vehicle-stat-value" style={{ fontSize: '1.2rem' }}>{book.entries.length}</span>
            </div>
          </div>
        </div>

        {/* Active Reminders */}
        {book.active_reminders.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>🔔 Напоминания</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {book.active_reminders.map((r) => (
                <div key={r.id} className="alert alert-warning" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <strong>{r.title}</strong>
                    {r.message && <div style={{ marginTop: 4, fontSize: '0.85rem', opacity: 0.8 }}>{r.message}</div>}
                    {r.trigger_mileage && (
                      <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
                        При пробеге: {r.trigger_mileage.toLocaleString()} км
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDismissReminder(r)}
                    style={{ flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h2>История ТО</h2>
          <Link to={`/vehicles/${vehicleId}/service-book/add`} className="btn btn-primary">
            + Добавить запись
          </Link>
        </div>

        {book.entries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📖</span>
            <h3>Книжка пуста</h3>
            <p>Добавьте первую запись о выполненном обслуживании</p>
            <Link to={`/vehicles/${vehicleId}/service-book/add`} className="btn btn-primary">
              Добавить запись
            </Link>
          </div>
        ) : (
          <div className="timeline">
            {book.entries.map((entry) => {
              const typeInfo = entryTypeLabels[entry.entry_type] || entryTypeLabels.other;
              return (
                <div key={entry.id} className="timeline-item">
                  <div className="card" style={{ marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: '1.5rem' }}>{typeInfo.icon}</span>
                        <div>
                          <div style={{ fontWeight: 700 }}>{entry.title}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{typeInfo.label}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {new Date(entry.serviced_at).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {entry.mileage_at_service.toLocaleString()} км
                        </div>
                      </div>
                    </div>

                    {entry.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--spacing-sm)' }}>
                        {entry.description}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
                      {entry.cost != null && (
                        <div>
                          <span className="price">{Number(entry.cost).toLocaleString()} ₽</span>
                        </div>
                      )}
                      {entry.next_service_mileage && (
                        <span className="tag">
                          🔔 След. через {entry.next_service_mileage.toLocaleString()} км
                        </span>
                      )}
                      {entry.receipt_url && (
                        <a
                          href={entry.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                        >
                          📄 Чек
                        </a>
                      )}
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
