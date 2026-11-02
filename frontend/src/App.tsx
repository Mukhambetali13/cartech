import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import VehiclesPage from './pages/VehiclesPage';
import AddVehiclePage from './pages/AddVehiclePage';
import ServiceBookPage from './pages/ServiceBookPage';
import ServicesPage from './pages/ServicesPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import NewOrderPage from './pages/NewOrderPage';

// Protected route wrapper
function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/services" element={<ServicesPage />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={<Protected><DashboardPage /></Protected>}
        />
        <Route
          path="/vehicles"
          element={<Protected><VehiclesPage /></Protected>}
        />
        <Route
          path="/vehicles/add"
          element={<Protected><AddVehiclePage /></Protected>}
        />
        <Route
          path="/vehicles/:vehicleId/service-book"
          element={<Protected><ServiceBookPage /></Protected>}
        />
        <Route
          path="/orders"
          element={<Protected><OrdersPage /></Protected>}
        />
        <Route
          path="/orders/new"
          element={<Protected><NewOrderPage /></Protected>}
        />
        <Route
          path="/orders/:id"
          element={<Protected><OrderDetailPage /></Protected>}
        />
        <Route
          path="/services/my"
          element={<Protected><ServicesPage /></Protected>}
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--spacing-xl) 0',
          textAlign: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.85rem',
        }}
      >
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <span>🚗</span>
            <strong style={{ color: 'var(--text-secondary)' }}>AutoMarket</strong>
          </div>
          <p>© 2024 AutoMarket — Маркетплейс автоуслуг</p>
        </div>
      </footer>
    </BrowserRouter>
  );
}
