import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './context/AuthContext.jsx';
import RutaProtegida from './components/RutaProtegida.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';

import Login from './pages/Login.jsx';
import Inicio from './pages/Inicio.jsx';
import Perfil from './pages/Perfil.jsx';
import Catalogo from './pages/Catalogo.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';

function Indice() {
  const { estaAutenticado } = useAuth();
  return <Navigate to={estaAutenticado ? '/inicio' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Indice />} />

      {/* Todo el panel: exige sesion y va dentro del layout con sidebar. */}
      <Route element={<RutaProtegida />}>
        <Route element={<DashboardLayout />}>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/:nombre" element={<Catalogo />} />
          <Route path="*" element={<NoEncontrado />} />
        </Route>
      </Route>
    </Routes>
  );
}