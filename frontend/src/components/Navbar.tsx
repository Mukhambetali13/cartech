import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-inner">
          <Link to="/" className="navbar-logo">
            <div className="logo-icon">🚗</div>
            <span>AutoMarket</span>
          </Link>

          <ul className="navbar-links">
            <li>
              <Link to="/services" className="navbar-link">
                Услуги
              </Link>
            </li>
            <li>
              <Link to="/services?type=sos" className="navbar-link">
                🆘 SOS выезд
              </Link>
            </li>
            {user && (
              <>
                <li>
                  <Link to="/dashboard" className="navbar-link">
                    Кабинет
                  </Link>
                </li>
                <li>
                  <Link to="/orders" className="navbar-link">
                    Заявки
                  </Link>
                </li>
              </>
            )}
          </ul>

          <div className="navbar-actions">
            {user ? (
              <>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {user.full_name}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                  Выйти
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">
                  Войти
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
