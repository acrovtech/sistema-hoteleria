import { Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import RequireAuth from './components/RequireAuth';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Reservations from './pages/Reservations';
import Rooms from './pages/Rooms';

function Layout() {
  const { user, logout } = useAuth();
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: 220, background: '#111827', color: 'white', padding: 16 }}>
        <h3>Hotel Admin</h3>
        <p style={{ fontSize: 12, opacity: 0.7 }}>Sistema interno vendible</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
          <Link to="/" style={{ color: 'white' }}>Dashboard</Link>
          <Link to="/habitaciones" style={{ color: 'white' }}>Habitaciones</Link>
          <Link to="/reservas" style={{ color: 'white' }}>Reservas / Check-in</Link>
        </div>
        <div style={{ marginTop: 24, fontSize: 12, opacity: 0.8 }}>
          <p style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
          <p>{user?.role}</p>
          <button onClick={logout} style={{ marginTop: 8 }}>Salir</button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: 24, background: '#F9FAFB' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/habitaciones" element={<Rooms />} />
          <Route path="/reservas" element={<Reservations />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
