import { useState, FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') as 'client' | 'master' | null;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'client' | 'master'>(defaultRole || 'client');
  const [error, setError] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }
    try {
      await register({ email, password, full_name: fullName, phone: phone || undefined, role });
      navigate('/dashboard');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Ошибка регистрации');
    }
  };

  return (
    <div
      className="page"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440, padding: 'var(--spacing-md)' }}>
        <div className="modal" style={{ maxWidth: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
            <div className="logo-icon" style={{ margin: '0 auto var(--spacing-md)', width: 48, height: 48, fontSize: '1.5rem' }}>
              🚗
            </div>
            <h2>Создать аккаунт</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 8 }}>
              Присоединяйтесь к AutoMarket
            </p>
          </div>

          {/* Role switcher */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 'var(--spacing-lg)',
              background: 'var(--color-surface)',
              padding: 4,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <button
              type="button"
              id="role-client"
              className={`btn ${role === 'client' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-sm)' }}
              onClick={() => setRole('client')}
            >
              🚗 Клиент
            </button>
            <button
              type="button"
              id="role-master"
              className={`btn ${role === 'master' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-sm)' }}
              onClick={() => setRole('master')}
            >
              🔧 Мастер / СТО
            </button>
          </div>

          {error && (
            <div className="alert alert-warning" style={{ marginBottom: 'var(--spacing-md)' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Имя / Название компании</label>
              <input
                id="reg-name"
                type="text"
                className="form-input"
                placeholder={role === 'master' ? 'Иван Иванов / ИП Петров' : 'Иван Иванов'}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-phone">Телефон (необязательно)</label>
              <input
                id="reg-phone"
                type="tel"
                className="form-input"
                placeholder="+7 900 000 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Пароль</label>
              <input
                id="reg-password"
                type="password"
                className="form-input"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--spacing-md)' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  Создание аккаунта...
                </>
              ) : (
                `Создать аккаунт ${role === 'master' ? 'мастера' : ''}`
              )}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Уже есть аккаунт?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
