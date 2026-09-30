import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  // `cargando` evita que RutaProtegida expulse a un usuario que todavia
  // no ha terminado de validar su cookie al recargar la pagina.
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;

    api
      .me()
      .then((respuesta) => {
        if (vivo) setUsuario(respuesta.usuario);
      })
      .catch(() => {
        if (vivo) setUsuario(null);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    return () => {
      vivo = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const respuesta = await api.login(email, password);
    setUsuario(respuesta.usuario);
    return respuesta.usuario;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUsuario(null);
    }
  }, []);

  /** Refresca los datos del usuario (por ejemplo tras cambiar la foto). */
  const refrescar = useCallback(async () => {
    try {
      const respuesta = await api.me();
      setUsuario(respuesta.usuario);
    } catch {
      setUsuario(null);
    }
  }, []);

  const valor = useMemo(
    () => ({ usuario, cargando, login, logout, refrescar, estaAutenticado: Boolean(usuario) }),
    [usuario, cargando, login, logout, refrescar],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}