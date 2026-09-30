import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ApiError } from '../api.js';

export default function Login() {
  const { usuario, login } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const destino = ubicacion.state?.desde ?? '/inicio';

  useEffect(() => {
    if (usuario) navegar(destino, { replace: true });
  }, [usuario, destino, navegar]);

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await login(email, password);
      navegar(destino, { replace: true });
    } catch (fallo) {
      // 429 = rate limit del backend; el mensaje ya viene en castellano.
      setError(fallo instanceof ApiError ? fallo.message : 'No se pudo iniciar sesion');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="ls-login">
      <div className="card ls-login-card">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i className="bi bi-mortarboard-fill text-primary" style={{ fontSize: '2.75rem' }} />
            <h1 className="h4 mt-2 mb-1">lab-escolar</h1>
            <p className="text-body-secondary small mb-0">Sistema de gestion escolar</p>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-1" /> {error}
            </div>
          )}

          <form onSubmit={enviar} noValidate>
            <div className="mb-3">
              <label className="form-label fw-semibold small" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                placeholder="admin@lab.local"
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold small" htmlFor="password">
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                value={password}
                onChange={(evento) => setPassword(evento.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={enviando}>
              {enviando && <span className="spinner-border spinner-border-sm me-2" />}
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}