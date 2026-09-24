import { useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from ?? '/';
      navigate(from, { replace: true });
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const serverMsg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      if (status === 401) {
        setError('Credenciales inválidas');
      } else if (!status) {
        setError('No se pudo contactar al API. Revisa tu conexión o la configuración del servidor.');
      } else {
        setError(Array.isArray(serverMsg) ? serverMsg.join(', ') : (serverMsg ?? `Error ${status}`));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F9FAFB' }}>
      <form onSubmit={onSubmit} style={{ background: 'white', padding: 32, borderRadius: 8, minWidth: 320, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2>Hotel Admin</h2>
        <p style={{ fontSize: 13, opacity: 0.7 }}>Sistema interno — inicia sesión</p>
        <label style={{ display: 'block', marginTop: 16, fontSize: 13 }}>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        {error && <p style={{ color: 'crimson', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={busy} style={{ marginTop: 16, width: '100%', padding: 10 }}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
