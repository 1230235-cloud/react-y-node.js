import { Navigate, useParams } from 'react-router-dom';
import CrudPage from '../components/CrudPage.jsx';
import NoEncontrado from './NoEncontrado.jsx';
import { ENTIDADES } from '../config/entidades.js';
import { useAuth } from '../context/AuthContext.jsx';

/** Resuelve el parametro de ruta y delega en CrudPage. */
export default function Catalogo() {
  const { nombre } = useParams();
  const { usuario } = useAuth();

  const entidad = ENTIDADES[nombre];
  if (!entidad) return <NoEncontrado />;

  // El backend tambien lo comprueba; esto solo evita un salto y un error.
  if (!entidad.rolesLectura.includes(usuario.rol)) {
    return <Navigate to="/inicio" replace />;
  }

  return <CrudPage nombre={nombre} />;
}