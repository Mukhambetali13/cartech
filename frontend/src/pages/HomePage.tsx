import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const sosServices = [
  { icon: '🔥', name: 'Отогрев авто', slug: 'car-heating' },
  { icon: '⚡', name: 'Прикурить авто', slug: 'jump-start' },
  { icon: '💻', name: 'Диагностика', slug: 'diagnostics' },
  { icon: '🔓', name: 'Вскрытие авто', slug: 'unlock' },
  { icon: '⛽', name: 'Подвоз топлива', slug: 'fuel-delivery' },
  { icon: '🚛', name: 'Эвакуатор', slug: 'tow-truck' },
  { icon: '🛞', name: 'Шиномонтаж', slug: 'mobile-tire-service' },
];

const plannedServices = [
  { icon: '🛢️', name: 'Замена масла', slug: 'engine-oil' },
  { icon: '🛑', name: 'Тормозные колодки', slug: 'brake-pads' },
  { icon: '🌬️', name: 'Фильтры', slug: 'filters' },
  { icon: '✨', name: 'Свечи зажигания', slug: 'spark-plugs' },
  { icon: '🔄', name: 'Шиномонтаж', slug: 'tire-service' },
];

export default function HomePage() {
  const { user } = useAuthStore();

  return (
    <main className="page">
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="container">
          <div className="hero-badge animate-fade-in">
            🚀 Маркетплейс автоуслуг нового поколения
          </div>
          <h1 className="hero-title animate-fade-in">
            Авто в надёжных руках —<br />
            <span className="gradient-text">мастера рядом с вами</span>
          </h1>
          <p className="hero-description animate-fade-in">
            Экстренная помощь на дороге или плановое ТО — найдите проверенного
            мастера за минуты. Цифровая сервисная книжка автоматически фиксирует
            все работы и напоминает о следующем ТО.
          </p>
          <div className="hero-actions animate-fade-in">
            <Link to="/services?type=sos" className="btn btn-sos sos-button animate-pulse-glow">
              🆘 Нужна срочная помощь
            </Link>
            <Link
              to={user ? '/dashboard' : '/register'}
              className="btn btn-ghost btn-lg"
            >
              {user ? 'Личный кабинет' : 'Зарегистрироваться'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Service Types ── */}
      <section className="container" style={{ marginBottom: 'var(--spacing-3xl)' }}>
        <div className="section-header">
          <h2 className="section-title">Выберите тип услуги</h2>
        </div>
        <div className="service-type-grid">
          {/* SOS Card */}
          <Link to="/services?type=sos" className="service-type-card sos">
            <span className="icon-large">🆘</span>
            <h3 style={{ color: '#FF6B7A', marginBottom: 8 }}>SOS / Срочно</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Выездные услуги — мастер приедет к вам в течение 30–60 минут
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {sosServices.map((s) => (
                <span key={s.slug} className="tag">
                  {s.icon} {s.name}
                </span>
              ))}
            </div>
          </Link>

          {/* Planned Card */}
          <Link to="/services?type=planned" className="service-type-card planned">
            <span className="icon-large">📋</span>
            <h3 style={{ color: '#4DDFAA', marginBottom: 8 }}>Плановое ТО</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Запись к мастеру или в СТО — фиксируется в цифровой сервисной книжке
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {plannedServices.map((s) => (
                <span key={s.slug} className="tag">
                  {s.icon} {s.name}
                </span>
              ))}
            </div>
          </Link>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="container" style={{ marginBottom: 'var(--spacing-3xl)' }}>
        <div className="section-header">
          <h2 className="section-title">Как это работает</h2>
        </div>
        <div className="grid-3">
          {[
            {
              icon: '🔍',
              title: 'Найдите услугу',
              desc: 'Выберите нужную услугу по фильтрам: геолокация, рейтинг, цена. Для SOS — мастера рядом на карте.',
            },
            {
              icon: '📞',
              title: 'Создайте заявку',
              desc: 'Опишите проблему, укажите адрес и удобное время. Мастер откликнется в считанные минуты.',
            },
            {
              icon: '📖',
              title: 'Сервисная книжка',
              desc: 'Все выполненные работы автоматически фиксируются. Получайте умные напоминания о следующем ТО.',
            },
          ].map((step) => (
            <div key={step.title} className="card card-gradient" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--spacing-md)' }}>
                {step.icon}
              </div>
              <h4 style={{ marginBottom: 'var(--spacing-sm)' }}>{step.title}</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA for Masters ── */}
      <section className="container" style={{ marginBottom: 'var(--spacing-3xl)' }}>
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(108,99,255,0.2) 0%, rgba(255,107,107,0.1) 100%)',
            border: '1px solid rgba(108,99,255,0.3)',
            textAlign: 'center',
            padding: 'var(--spacing-3xl)',
          }}
        >
          <h2 style={{ marginBottom: 'var(--spacing-md)' }}>Вы мастер или СТО?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-xl)', maxWidth: 500, margin: '0 auto var(--spacing-xl)' }}>
            Получайте поток целевых заявок без затрат на маркетинг. Управляйте
            расписанием, принимайте онлайн-оплату и растите рейтинг через
            прозрачные отзывы.
          </p>
          <Link to="/register?role=master" className="btn btn-primary btn-lg">
            Зарегистрироваться как мастер
          </Link>
        </div>
      </section>
    </main>
  );
}
