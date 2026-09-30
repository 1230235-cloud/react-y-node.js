import { Link } from 'react-router-dom';

export default function NoEncontrado() {
  return (
    <div className="text-center py-5">
      <div className="display-1 fw-bold text-body-tertiary">404</div>
      <h1 className="h4 mb-3">Pagina no encontrada</h1>
      <p className="text-body-secondary mb-4">La ruta que buscas no existe.</p>
      <Link to="/inicio" className="btn btn-primary">
        Volver al inicio
      </Link>
    </div>
  );
}