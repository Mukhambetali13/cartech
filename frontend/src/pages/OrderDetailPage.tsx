import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { offersApi, ordersApi } from '../api';
import { useAuthStore } from '../store/authStore';
import type { Order, OrderOfferWithMaster } from '../types';

const statusLabels: Record<string, string> = {
  open: 'Открыта',
  accepted: 'Принята',
  in_progress: 'В работе',
  completed: 'Завершена',
  cancelled: 'Отменена',
};

const offerStatusLabels: Record<string, string> = {
  pending: 'Ожидает',
  accepted: 'Принято',
  declined: 'Отклонено',
};

function StarRating({ value }: { value?: number | null }) {
  if (!value) return null;
  return (
    <span style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
      {'★'.repeat(Math.round(value))}{'☆'.repeat(5 - Math.round(value))}
      <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{Number(value).toFixed(1)}</span>
    </span>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [order, setOrder] = useState<Order | null>(null);
  const [offers, setOffers] = useState<OrderOfferWithMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Offer form (master)
  const [offerPrice, setOfferPrice] = useState('');
  const [offerComment, setOfferComment] = useState('');
  const [offerSubmitting, setOfferSubmitting] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerSuccess, setOfferSuccess] = useState(false);

  // Status update
  const [statusUpdating, setStatusUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [orderData, offersData] = await Promise.all([
        ordersApi.get(id),
        offersApi.list(id),
      ]);
      setOrder(orderData);
      setOffers(offersData);
    } catch {
      setError('Не удалось загрузить данные. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const price = parseFloat(offerPrice);
    if (isNaN(price) || price <= 0) {
      setOfferError('Введите корректную цену больше нуля');
      return;
    }
    setOfferSubmitting(true);
    setOfferError('');
    try {
      await offersApi.create(id, { price, comment: offerComment || undefined });
      setOfferSuccess(true);
      setOfferPrice('');
      setOfferComment('');
      await fetchData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setOfferError(msg || 'Не удалось отправить предложение');
    } finally {
      setOfferSubmitting(false);
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    if (!id) return;
    try {
      await offersApi.accept(id, offerId);
      await fetchData();
    } catch {
      alert('Не удалось принять предложение');
    }
  };

  const handleDeclineOffer = async (offerId: string) => {
    if (!id) return;
    try {
      await offersApi.decline(id, offerId);
      await fetchData();
    } catch {
      alert('Не удалось отклонить предложение');
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!id) return;
    setStatusUpdating(true);
    try {
      await ordersApi.updateStatus(id, status);
      await fetchData();
    } catch {
      alert('Не удалось обновить статус');
    } finally {
      setStatusUpdating(false);
    }
  };

  const myOffer = user?.role === 'master'
    ? offers.find((o) => o.master_id === user?.id)
    : null;

  if (loading) return (
    <div className="page">
      <div className="container">
        <div className="loader"><div className="spinner" /></div>
      </div>
    </div>
  );

  if (error || !order) return (
    <div className="page">
      <div className="container">
        <div className="alert alert-warning">{error || 'Заявка не найдена'}</div>
        <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => navigate('/orders')}>
          ← Назад к заявкам
        </button>
      </div>
    </div>
  );

  const pendingOffers = offers.filter((o) => o.status === 'pending');
  const acceptedOffer = offers.find((o) => o.status === 'accepted');
  const isOpen = order.status === 'open';
  const isClient = user?.role === 'client';
  const isMaster = user?.role === 'master';

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 760 }}>
        {/* Back button */}
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 'var(--spacing-lg)' }}
          onClick={() => navigate('/orders')}
        >
          ← Назад
        </button>

        {/* Order header card */}
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: '1.4rem', marginBottom: 8 }}>{order.title}</h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge badge-${order.service_type}`}>
                  {order.service_type === 'sos' ? '🆘 SOS' : '📋 ТО'}
                </span>
                <span className={`badge badge-status-${order.status}`}>
                  {statusLabels[order.status]}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {new Date(order.created_at).toLocaleString('ru-RU')}
                </span>
              </div>
            </div>
            {order.price_agreed && (
              <div style={{ textAlign: 'right' }}>
                <div className="price" style={{ fontSize: '1.4rem' }}>
                  {Number(order.price_agreed).toLocaleString()} ₽
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Согласованная цена</div>
              </div>
            )}
          </div>

          {order.description && (
            <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--spacing-md)', lineHeight: 1.6 }}>
              {order.description}
            </p>
          )}

          {order.address && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 12 }}>
              📍 {order.address}
            </div>
          )}

          {order.scheduled_at && (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
              🗓 Запланировано: {new Date(order.scheduled_at).toLocaleString('ru-RU')}
            </div>
          )}

          {/* Status actions for master (in_progress / completed / cancel) */}
          {isMaster && order.status === 'accepted' && order.master_id === user?.id && (
            <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                className="btn btn-primary"
                disabled={statusUpdating}
                onClick={() => handleUpdateStatus('in_progress')}
              >
                🔧 Начать работу
              </button>
            </div>
          )}
          {isMaster && order.status === 'in_progress' && order.master_id === user?.id && (
            <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                className="btn btn-primary"
                disabled={statusUpdating}
                onClick={() => handleUpdateStatus('completed')}
              >
                ✅ Завершить работу
              </button>
            </div>
          )}

          {/* Client cancel */}
          {isClient && ['open', 'accepted'].includes(order.status) && (
            <div style={{ marginTop: 'var(--spacing-lg)' }}>
              <button
                className="btn btn-sm"
                style={{ background: 'rgba(255,71,87,0.1)', color: '#FF6B7A', border: '1px solid rgba(255,71,87,0.3)' }}
                disabled={statusUpdating}
                onClick={() => handleUpdateStatus('cancelled')}
              >
                ✕ Отменить заявку
              </button>
            </div>
          )}
        </div>

        {/* ─── MASTER: Submit offer panel ─── */}
        {isMaster && isOpen && (
          <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-xl)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>
              {myOffer ? '✏️ Обновить моё предложение' : '💰 Предложить цену'}
            </h3>

            {myOffer && (
              <div
                style={{
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-md)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Ваше текущее предложение:</span>
                  <span className="price">{Number(myOffer.price).toLocaleString()} ₽</span>
                </div>
                {myOffer.comment && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
                    {myOffer.comment}
                  </p>
                )}
              </div>
            )}

            {offerSuccess && !myOffer && (
              <div className="alert alert-success" style={{ marginBottom: 'var(--spacing-md)' }}>
                ✅ Предложение отправлено! Ожидайте ответа клиента.
              </div>
            )}

            <form onSubmit={(e) => { void handleSubmitOffer(e); }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '1 1 160px' }}>
                  <label className="form-label" htmlFor="offer-price">Цена (₽) *</label>
                  <input
                    id="offer-price"
                    className="form-input"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Например: 2500"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: '2 1 280px' }}>
                  <label className="form-label" htmlFor="offer-comment">Комментарий (необязательно)</label>
                  <input
                    id="offer-comment"
                    className="form-input"
                    type="text"
                    placeholder="Что входит в стоимость, сроки..."
                    value={offerComment}
                    onChange={(e) => setOfferComment(e.target.value)}
                  />
                </div>
              </div>
              {offerError && (
                <div className="alert alert-warning" style={{ marginTop: 8 }}>{offerError}</div>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginTop: 'var(--spacing-md)' }}
                disabled={offerSubmitting}
              >
                {offerSubmitting ? 'Отправка...' : myOffer ? '🔄 Обновить предложение' : '📤 Отправить предложение'}
              </button>
            </form>
          </div>
        )}

        {/* ─── CLIENT: Offers from masters ─── */}
        {isClient && (
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h2 style={{ marginBottom: 'var(--spacing-md)', fontSize: '1.1rem' }}>
              💬 Предложения мастеров
              {pendingOffers.length > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: 'var(--color-primary)',
                    color: 'white',
                    borderRadius: 12,
                    padding: '2px 10px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  {pendingOffers.length}
                </span>
              )}
            </h2>

            {offers.length === 0 ? (
              <div className="card" style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⏳</div>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Пока нет предложений от мастеров. Они появятся здесь, как только кто-то откликнется.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {/* Accepted offer pinned on top */}
                {acceptedOffer && (
                  <div
                    key={acceptedOffer.id}
                    style={{
                      background: 'rgba(16,185,129,0.08)',
                      border: '2px solid rgba(16,185,129,0.4)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--spacing-lg)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>{acceptedOffer.master_name}</span>
                          <span style={{ background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 10px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                            ✅ Принято
                          </span>
                        </div>
                        {acceptedOffer.master_rating && (
                          <StarRating value={acceptedOffer.master_rating} />
                        )}
                        {acceptedOffer.comment && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8 }}>
                            {acceptedOffer.comment}
                          </p>
                        )}
                      </div>
                      <div className="price" style={{ fontSize: '1.4rem', flexShrink: 0 }}>
                        {Number(acceptedOffer.price).toLocaleString()} ₽
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending offers */}
                {pendingOffers.map((offer) => (
                  <div
                    key={offer.id}
                    style={{
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: 'var(--spacing-lg)',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
                          {offer.master_name || 'Мастер'}
                        </div>
                        {offer.master_company && (
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>
                            🏢 {offer.master_company}
                          </div>
                        )}
                        <StarRating value={offer.master_rating} />
                        {offer.master_review_count != null && offer.master_review_count > 0 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: 6 }}>
                            ({offer.master_review_count} отзывов)
                          </span>
                        )}
                        {offer.comment && (
                          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 8, lineHeight: 1.5 }}>
                            💬 {offer.comment}
                          </p>
                        )}
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>
                          {new Date(offer.created_at).toLocaleString('ru-RU')}
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-sm)', flexShrink: 0 }}>
                        <div className="price" style={{ fontSize: '1.3rem' }}>
                          {Number(offer.price).toLocaleString()} ₽
                        </div>
                        {isOpen && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              id={`accept-offer-${offer.id}`}
                              className="btn btn-primary btn-sm"
                              onClick={() => void handleAcceptOffer(offer.id)}
                            >
                              ✅ Принять
                            </button>
                            <button
                              id={`decline-offer-${offer.id}`}
                              className="btn btn-sm"
                              style={{ background: 'rgba(255,71,87,0.1)', color: '#FF6B7A', border: '1px solid rgba(255,71,87,0.3)' }}
                              onClick={() => void handleDeclineOffer(offer.id)}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Declined offers (collapsed) */}
                {offers.filter((o) => o.status === 'declined').length > 0 && (
                  <details style={{ cursor: 'pointer' }}>
                    <summary style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0', userSelect: 'none' }}>
                      Отклонённые предложения ({offers.filter((o) => o.status === 'declined').length})
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      {offers.filter((o) => o.status === 'declined').map((offer) => (
                        <div
                          key={offer.id}
                          style={{
                            background: 'rgba(0,0,0,0.1)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--spacing-md)',
                            opacity: 0.6,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>{offer.master_name}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{Number(offer.price).toLocaleString()} ₽</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── MASTER: My offer status ─── */}
        {isMaster && !isOpen && myOffer && (
          <div className="card" style={{ padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Моё предложение</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '3px 12px',
                    borderRadius: 12,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: myOffer.status === 'accepted'
                      ? 'rgba(16,185,129,0.15)'
                      : myOffer.status === 'declined'
                      ? 'rgba(255,71,87,0.15)'
                      : 'rgba(245,158,11,0.15)',
                    color: myOffer.status === 'accepted'
                      ? '#10b981'
                      : myOffer.status === 'declined'
                      ? '#FF6B7A'
                      : '#f59e0b',
                  }}
                >
                  {offerStatusLabels[myOffer.status]}
                </span>
                {myOffer.comment && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 6 }}>
                    {myOffer.comment}
                  </p>
                )}
              </div>
              <span className="price">{Number(myOffer.price).toLocaleString()} ₽</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
