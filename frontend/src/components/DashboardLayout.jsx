import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { urlFoto } from '../api.js';
import { ENTIDADES, entidadesVisibles } from '../config/entidades.js';

const ETIQUETA_ROL = { admin: 'Administrador', maestro: 'Maestro', alumno: 'Alumno' };

export function Avatar({ usuario, className = 'ls-avatar', ...resto }) {
  const [fallo, setFallo] = useState(false);
  const foto = urlFoto(usuario?.foto);

  if (foto && !fallo) {
    return (
      <img
        src={foto}
        alt={`Foto de ${usuario.nombre}`}
        className={className}
        onError={() => setFallo(true)}
        {...resto}
      />
    );
  }

  return (
    <span className={className} aria-hidden="true" {...resto}>
      {usuario?.nombre?.charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}

export default function DashboardLayout() {
  const { usuario, logout } = useAuth();
  const navegar = useNavigate();

  // new Date() durante el render es impuro (el resultado cambiaria entre
  // renders); se fija una vez al montar.
  const [hoy] = useState(() =>
    new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }),
  );

  const visibles = entidadesVisibles(usuario.rol);

  async function cerrarSesion() {
    await logout();
    navegar('/login', { replace: true });
  }

  return (
    <div className="d-flex">
      <aside className="ls-sidebar">
        <div className="ls-brand d-flex align-items-center gap-2">
          <i className="bi bi-mortarboard-fill fs-4 text-primary" />
          <strong>lab-escolar</strong>
        </div>

        <div className="ls-user">
          <Avatar usuario={usuario} />
          <div className="mt-3 fw-semibold text-white text-truncate">{usuario.nombre}</div>
          <div className="small text-truncate">{usuario.email}</div>
          <span
            className={`badge mt-2 ${
              usuario.rol === 'admin'
                ? 'text-bg-danger'
                : usuario.rol === 'maestro'
                  ? 'text-bg-primary'
                  : 'text-bg-secondary'
            }`}
          >
            {ETIQUETA_ROL[usuario.rol] ?? usuario.rol}
          </span>
        </div>

        <nav className="ls-nav flex-grow-1">
          <div className="ls-section">General</div>
          <ul className="nav flex-column">
            <li className="nav-item">
              <NavLink to="/inicio" className="nav-link" end>
                <i className="bi bi-speedometer2" /> Inicio
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/perfil" className="nav-link">
                <i className="bi bi-person-circle" /> Mi perfil
              </NavLink>
            </li>
          </ul>

          {visibles.length > 0 && (
            <>
              <div className="ls-section">Catalogos</div>
              <ul className="nav flex-column">
                {visibles.map((nombre) => (
                  <li className="nav-item" key={nombre}>
                    <NavLink to={`/${nombre}`} className="nav-link">
                      <i className={`bi ${ENTIDADES[nombre].icono}`} /> {ENTIDADES[nombre].titulo}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="p-3 border-top border-secondary">
          <button
            type="button"
            className="btn btn-outline-light btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
            onClick={cerrarSesion}
          >
            <i className="bi bi-box-arrow-right" /> Cerrar sesion
          </button>
        </div>
      </aside>

      <div className="ls-main">
        <header className="ls-topbar">
          <span className="fw-semibold text-body-secondary">Sistema Escolar</span>
          <div className="d-flex align-items-center gap-2">
            <span className="text-body-secondary small d-none d-sm-inline">{hoy}</span>
            <NavLink to="/perfil" className="btn btn-sm btn-outline-secondary">
              <i className="bi bi-person-circle" />
            </NavLink>
          </div>
        </header>

        <main className="ls-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}