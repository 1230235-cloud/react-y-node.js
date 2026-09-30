import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Guarda una ruta del panel. Sin sesion manda a /login conservando el
 * destino en el estado de la ubicacion; con sesion pero sin el rol
 * necesario vuelve a /inicio.
 */
export default function RutaProtegida({ roles }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-body-secondary mt-3 mb-0">Verificando sesion...</p>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace state={{ desde: location.pathname + location.search }} />;
  }

  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(usuario.rol)) {
    return <Navigate to="/inicio" replace />;
  }

  return <Outlet />;
}