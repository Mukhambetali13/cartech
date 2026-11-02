import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { vehiclesApi, ordersApi } from '../api';
import type { Vehicle, Order } from '../types';

const statusLabels: Record<string, string> = {
  open: 'Открыта',
  accepted: 'Принята',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [v, o] = await Promise.all([
          vehiclesApi.list(),
          ordersApi.list(),
        ]);
        setVehicles(v);
        setRecentOrders(o.slice(0, 5));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="loader">
        <div className="spinner" />
      </div>
    );
  }

  const isClient = user?.role === 'client';
  const isMaster = user?.role === 'master';

  return (
    <div className="page">
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 8 }}>
            Добрый день, {user?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {isClient ? 'Управляйте своими автомобилями и заявками' : 'Управляйте заявками и услугами'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid-3" style={{ marginBottom: 'var(--spacing-xl)' }}>
          {isClient && (
            <>
              <Link to="/services?type=sos" className="card" style={{ display: 'block', border: '1px solid rgba(255,71,87,0.3)', background: 'rgba(255,71,87,0.05)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🆘</div>
                <h4>SOS Помощь</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Вызвать мастера прямо сейчас</p>
              </Link>
              <Link to="/vehicles/add" className="card" style={{ display: 'block' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🚗</div>
                <h4>Добавить авто</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Добавить новый автомобиль</p>
              </Link>
              <Link to="/orders/new" className="card" style={{ display: 'block' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
                <h4>Новая заявка</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Записаться на ТО</p>
              </Link>
            </>
          )}
          {isMaster && (
            <>
              <Link to="/orders?status=open" className="card" style={{ display: 'block', border: '1px solid rgba(46,213,115,0.3)', background: 'rgba(46,213,115,0.05)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📥</div>
                <h4>Открытые заявки</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Просмотреть и откликнуться</p>
              </Link>
              <Link to="/services/my" className="card" style={{ display: 'block' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔧</div>
                <h4>Мои услуги</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Управлять прайсом</p>
              </Link>
              <Link to="/orders" className="card" style={{ display: 'block' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
                <h4>История работ</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 4 }}>Просмотреть все заказы</p>
              </Link>
            </>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isClient ? '1fr 1fr' : '1fr', gap: 'var(--spacing-xl)' }}>
          {/* Vehicles (client only) */}
          {isClient && (
            <section>
              <div className="section-header">
                <h3 className="section-title" style={{ fontSize: '1.1rem' }}>Мои автомобили</h3>
                <Link to="/vehicles" className="btn btn-ghost btn-sm">Все</Link>
              </div>

              {vehicles.length === 0 ? (
                <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                  <span className="empty-state-icon">🚗</span>
                  <p>Нет добавленных автомобилей</p>
                  <Link to="/vehicles/add" className="btn btn-primary btn-sm">Добавить</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                  {vehicles.slice(0, 3).map((v) => (
                    <Link key={v.id} to={`/vehicles/${v.id}`} className="vehicle-card" style={{ display: 'block' }}>
                      <div className="vehicle-card-header">
                        <div>
                          <div className="vehicle-make-model">{v.make} {v.model}</div>
                          <div className="vehicle-year">{v.year}</div>
                        </div>
                        {v.plate_number && (
                          <div className="vehicle-plate">{v.plate_number}</div>
                        )}
                      </div>
                      <div className="vehicle-card-body">
                        <div className="vehicle-stats">
                          {v.current_mileage && (
                            <div className="vehicle-stat">
                              <span className="vehicle-stat-label">Пробег</span>
                              <span className="vehicle-stat-value">{v.current_mileage.toLocaleString()} км</span>
                            </div>
                          )}
                          {v.engine_type && (
                            <div className="vehicle-stat">
                              <span className="vehicle-stat-label">Двигатель</span>
                              <span className="vehicle-stat-value">{v.engine_type}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Recent Orders */}
          <section>
            <div className="section-header">
              <h3 className="section-title" style={{ fontSize: '1.1rem' }}>
                {isMaster ? 'Активные заявки' : 'Последние заявки'}
              </h3>
              <Link to="/orders" className="btn btn-ghost btn-sm">Все</Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--spacing-xl)' }}>
                <span className="empty-state-icon">📋</span>
                <p>Нет заявок</p>
                {isClient && (
                  <Link to="/orders/new" className="btn btn-primary btn-sm">Создать</Link>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    to={`/orders/${order.id}`}
                    className="order-card"
                    style={{ display: 'block' }}
                  >
                    <div className="order-card-header">
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{order.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {new Date(order.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <span className={`badge badge-${order.service_type}`}>
                          {order.service_type === 'sos' ? '🆘 SOS' : '📋 ТО'}
                        </span>
                        <span className={`badge badge-status-${order.status}`}>
                          {statusLabels[order.status]}
                        </span>
                      </div>
                    </div>
                    {order.price_agreed && (
                      <div className="price">{Number(order.price_agreed).toLocaleString()} ₸</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
