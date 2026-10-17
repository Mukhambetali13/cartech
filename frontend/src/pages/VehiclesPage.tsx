import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { vehiclesApi } from '../api';
import type { Vehicle } from '../types';

const transmissionLabels: Record<string, string> = {
  auto: 'Автомат',
  manual: 'Механика',
  cvt: 'Вариатор',
};

const engineLabels: Record<string, string> = {
  petrol: '⛽ Бензин',
  diesel: '🛢️ Дизель',
  electric: '⚡ Электро',
  hybrid: '♻️ Гибрид',
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = async () => {
    try {
      const data = await vehiclesApi.list();
      setVehicles(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить автомобиль? Это также удалит всю историю ТО.')) return;
    try {
      await vehiclesApi.delete(id);
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    } catch {
      alert('Не удалось удалить автомобиль');
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="section-header">
          <h1>Мои автомобили</h1>
          <Link to="/vehicles/add" className="btn btn-primary">
            + Добавить авто
          </Link>
        </div>

        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : vehicles.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">🚗</span>
            <h3>Нет добавленных автомобилей</h3>
            <p>Добавьте свой первый автомобиль, чтобы вести цифровую сервисную книжку</p>
            <Link to="/vehicles/add" className="btn btn-primary">Добавить автомобиль</Link>
          </div>
        ) : (
          <div className="grid-2">
            {vehicles.map((v) => (
              <div key={v.id} className="vehicle-card">
                <div className="vehicle-card-header">
                  <div>
                    <div className="vehicle-make-model">{v.make} {v.model}</div>
                    <div className="vehicle-year">{v.year} г.</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {v.plate_number && (
                      <div className="vehicle-plate">{v.plate_number}</div>
                    )}
                    {v.color && (
                      <div
                        title={v.color}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: v.color.toLowerCase(),
                          border: '2px solid var(--color-border-strong)',
                        }}
                      />
                    )}
                  </div>
                </div>

                <div className="vehicle-card-body">
                  <div className="vehicle-stats">
                    {v.current_mileage != null && (
                      <div className="vehicle-stat">
                        <span className="vehicle-stat-label">Пробег</span>
                        <span className="vehicle-stat-value">{v.current_mileage.toLocaleString()} км</span>
                      </div>
                    )}
                    {v.engine_type && (
                      <div className="vehicle-stat">
                        <span className="vehicle-stat-label">Тип</span>
                        <span className="vehicle-stat-value">{engineLabels[v.engine_type] || v.engine_type}</span>
                      </div>
                    )}
                    {v.transmission && (
                      <div className="vehicle-stat">
                        <span className="vehicle-stat-label">КПП</span>
                        <span className="vehicle-stat-value">{transmissionLabels[v.transmission] || v.transmission}</span>
                      </div>
                    )}
                    {v.vin && (
                      <div className="vehicle-stat">
                        <span className="vehicle-stat-label">VIN</span>
                        <span className="vehicle-stat-value" style={{ fontSize: '0.75rem' }}>{v.vin}</span>
                      </div>
                    )}
                  </div>

                  <div className="divider" style={{ margin: 'var(--spacing-md) 0' }} />

                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <Link to={`/vehicles/${v.id}/service-book`} className="btn btn-ghost btn-sm">
                      📖 Сервисная книжка
                    </Link>
                    <Link to={`/vehicles/${v.id}`} className="btn btn-ghost btn-sm">
                      ✏️ Редактировать
                    </Link>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(255,71,87,0.1)', color: '#FF6B7A', border: '1px solid rgba(255,71,87,0.3)' }}
                      onClick={() => handleDelete(v.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
