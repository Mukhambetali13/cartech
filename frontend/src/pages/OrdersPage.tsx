import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ordersApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { Order, OrderStatus } from '../types';

const statusLabels: Record<OrderStatus, string> = {
  open: 'Открыта',
  accepted: 'Принята',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

const statusOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'Все' },
  { value: 'open', label: 'Открытые' },
  { value: 'accepted', label: 'Принятые' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'completed', label: 'Завершённые' },
  { value: 'cancelled', label: 'Отменённые' },
];

export default function OrdersPage() {
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const typeFilter = searchParams.get('type') || '';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await ordersApi.list({
        status: statusFilter || undefined,
        service_type: typeFilter || undefined,
      });
      setOrders(data);
    } catch {
      setError('Не удалось загрузить заявки. Проверьте подключение и попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => { void fetchOrders(); }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, status: string) => {
    try {
      await ordersApi.updateStatus(orderId, status);
      fetchOrders();
    } catch {
      alert('Не удалось обновить статус');
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="section-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <h1>
            {user?.role === 'master' ? 'Заявки клиентов' : 'Мои заявки'}
          </h1>
          {user?.role === 'client' && (
            <Link to="/orders/new" className="btn btn-primary">
              + Создать заявку
            </Link>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)', flexWrap: 'wrap' }}>
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              id={`order-filter-${opt.value || 'all'}`}
              className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => {
                if (opt.value) searchParams.set('status', opt.value);
                else searchParams.delete('status');
                setSearchParams(searchParams);
              }}
            >
              {opt.label}
            </button>
          ))}
          <div className="divider" style={{ width: 1, height: 'auto', margin: '0 4px' }} />
          <button
            className={`btn btn-sm ${typeFilter === 'sos' ? '' : 'btn-ghost'}`}
            style={typeFilter === 'sos' ? { background: 'var(--gradient-sos)', color: 'white' } : {}}
            onClick={() => {
              if (typeFilter === 'sos') searchParams.delete('type');
              else searchParams.set('type', 'sos');
              setSearchParams(searchParams);
            }}
          >
            🆘 SOS
          </button>
          <button
            className={`btn btn-sm ${typeFilter === 'planned' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => {
              if (typeFilter === 'planned') searchParams.delete('type');
              else searchParams.set('type', 'planned');
              setSearchParams(searchParams);
            }}
          >
            📋 ТО
          </button>
        </div>

        {error && <div className="alert alert-warning" role="alert" style={{ marginBottom: 'var(--spacing-lg)' }}>{error}</div>}
        {loading ? (
          <div className="loader"><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            <h3>Нет заявок</h3>
            {user?.role === 'client' && (
              <>
                <p>Создайте первую заявку на обслуживание</p>
                <Link to="/orders/new" className="btn btn-primary">Создать заявку</Link>
              </>
            )}
            {user?.role === 'master' && (
              <p>Активных заявок пока нет. Появятся — вы увидите их здесь.</p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <div className="order-card-header">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {order.title}
                    </h4>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${order.service_type}`}>
                        {order.service_type === 'sos' ? '🆘 SOS' : '📋 ТО'}
                      </span>
                      <span className={`badge badge-status-${order.status}`}>
                        {statusLabels[order.status]}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {new Date(order.created_at).toLocaleDateString('ru-RU')}
                      </span>
                      {order.counterparty_name && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          {user?.role === 'master' ? 'Клиент' : 'Мастер'}: {order.counterparty_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexShrink: 0 }}>
                    {order.price_agreed && (
                      <span className="price">{Number(order.price_agreed).toLocaleString()} ₸</span>
                    )}
                    {/* Master on open orders → prompt to make a price offer */}
                    <Link to={`/orders/${order.id}`} className="btn btn-ghost btn-sm">
                      {user?.role === 'master' && order.status === 'open' ? '💰 Предложить цену' : 'Детали'}
                    </Link>
                  </div>
                </div>

                {order.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 'var(--spacing-sm)' }}>
                    {order.description}
                  </p>
                )}

                {order.address && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6 }}>
                    📍 {order.address}
                  </div>
                )}

                {/* Master: workflow actions for their assigned orders */}
                {user?.role === 'master' && order.status === 'accepted' && order.master_id === user?.id && (
                  <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(order.id, 'in_progress')}>
                      🔧 Начать работу
                    </button>
                  </div>
                )}

                {user?.role === 'master' && order.status === 'in_progress' && order.master_id === user?.id && (
                  <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleUpdateStatus(order.id, 'completed')}>
                      ✅ Завершить
                    </button>
                  </div>
                )}

                {/* Client: cancel */}
                {user?.role === 'client' && ['open', 'accepted'].includes(order.status) && (
                  <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <button
                      className="btn btn-sm"
                      style={{ background: 'rgba(255,71,87,0.1)', color: '#FF6B7A', border: '1px solid rgba(255,71,87,0.3)' }}
                      onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                    >
                      ✕ Отменить
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
