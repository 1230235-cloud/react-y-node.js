import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ENTIDADES, entidadesVisibles } from '../config/entidades.js';
import { Avatar } from '../components/DashboardLayout.jsx';

const ETIQUETA_ROL = { admin: 'Administrador', maestro: 'Maestro', alumno: 'Alumno' };

export default function Inicio() {
  const { usuario } = useAuth();
  const visibles = useMemo(() => entidadesVisibles(usuario.rol), [usuario.rol]);

  const [totales, setTotales] = useState({});
  const [fallidos, setFallidos] = useState([]);

  useEffect(() => {
    let vivo = true;

    // limit=1 porque solo interesa el campo pagination.total.
    Promise.all(
      visibles.map((nombre) =>
        api
          .listar(nombre, { limit: 1 })
          .then((respuesta) => [nombre, respuesta.pagination.total])
          .catch(() => [nombre, null]),
      ),
    ).then((pares) => {
      if (!vivo) return;
      setTotales(Object.fromEntries(pares.filter(([, total]) => total !== null)));
      setFallidos(pares.filter(([, total]) => total === null).map(([nombre]) => nombre));
    });

    return () => {
      vivo = false;
    };
  }, [visibles]);

  return (
    <>
      <div className="mb-4">
        <h1 className="h3 mb-1">
          Hola, {usuario.nombre.split(' ')[0]}
        </h1>
        <p className="text-body-secondary mb-0">
          Sesion iniciada como <strong>{ETIQUETA_ROL[usuario.rol] ?? usuario.rol}</strong>
        </p>
      </div>

      {fallidos.length > 0 && (
        <div className="alert alert-warning small" role="alert">
          No se pudieron cargar: {fallidos.join(', ')}.
        </div>
      )}

      <div className="row g-3 mb-4">
        {visibles.map((nombre) => (
          <div className="col-12 col-sm-6 col-xl-3" key={nombre}>
            <Link
              to={`/${nombre}`}
              className="card text-decoration-none h-100 shadow-sm border-0"
              aria-label={`Ir a ${ENTIDADES[nombre].titulo}`}
            >
              <div className="card-body d-flex align-items-center gap-3">
                <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-3">
                  <i className={`bi ${ENTIDADES[nombre].icono} fs-4`} />
                </div>
                <div>
                  <div className="fs-4 fw-bold lh-1">
                    {totales[nombre] ?? (fallidos.includes(nombre) ? '—' : '…')}
                  </div>
                  <div className="text-body-secondary small">{ENTIDADES[nombre].titulo}</div>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-7">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5">Tu perfil</h2>
              <div className="d-flex align-items-center gap-3 mb-3">
                <Avatar usuario={usuario} className="ls-avatar" style={{ width: 56, height: 56, fontSize: '1.4rem' }} />
                <div>
                  <div className="fw-semibold">{usuario.nombre}</div>
                  <div className="text-body-secondary small">{usuario.email}</div>
                </div>
              </div>
              <p className="text-body-secondary small mb-3">
                Puedes actualizar tu foto y tu contrasena desde la seccion de perfil.
              </p>
              <Link to="/perfil" className="btn btn-outline-primary btn-sm">
                Ir a mi perfil <i className="bi bi-arrow-right ms-1" />
              </Link>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <h2 className="h5">Accesos rapidos</h2>
              <ul className="list-group list-group-flush">
                {visibles.map((nombre) => (
                  <li className="list-group-item px-0 d-flex justify-content-between align-items-center" key={nombre}>
                    <Link to={`/${nombre}`} className="text-decoration-none">
                      {ENTIDADES[nombre].titulo}
                    </Link>
                    <i className="bi bi-chevron-right text-body-secondary small" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}