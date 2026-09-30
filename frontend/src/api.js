/**
 * Cliente HTTP del backend.
 *
 * Todas las peticiones van con credentials: 'include' para que viaje la
 * cookie de sesion (httpOnly, SameSite=Strict). No hace falta CORS porque
 * el proxy de Vite hace que /api y el frontend compartan origen.
 */

const BASE = '/api';

export class ApiError extends Error {
  constructor(status, mensaje, details) {
    super(mensaje);
    this.name = 'ApiError';
    this.status = status;
    this.details = details ?? null;
  }
}

async function request(ruta, { metodo = 'GET', cuerpo, cuerpoFormData, cabeceras } = {}) {
  const opciones = {
    method: metodo,
    credentials: 'include',
    headers: { Accept: 'application/json', ...cabeceras },
  };

  if (cuerpoFormData) {
    // Con FormData no se fija Content-Type: el navegador debe escribir el
    // boundary multipart que Multer espera.
    opciones.body = cuerpoFormData;
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, opciones);
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor');
  }

  if (respuesta.status === 204) return null;

  const texto = await respuesta.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = null;
    }
  }

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      datos?.error ?? `Error ${respuesta.status}`,
      datos?.details,
    );
  }

  return datos;
}

function construirQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [clave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null || valor === '') continue;
    query.set(clave, String(valor));
  }
  const cadena = query.toString();
  return cadena ? `?${cadena}` : '';
}

export const api = {
  // ---- Auth ----
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { metodo: 'POST', cuerpo: { email, password } }),
  logout: () => request('/auth/logout', { metodo: 'POST' }),
  cambiarPassword: (passwordActual, passwordNuevo) =>
    request('/auth/password', { metodo: 'PATCH', cuerpo: { passwordActual, passwordNuevo } }),
  subirFoto: (archivo) => {
    const formData = new FormData();
    formData.append('foto', archivo);
    return request('/auth/foto', { metodo: 'POST', cuerpoFormData: formData });
  },

  // ---- Catalogo generico ----
  listar: (entidad, params) => request(`/${entidad}${construirQuery(params)}`),
  obtener: (entidad, id) => request(`/${entidad}/${id}`),
  crear: (entidad, cuerpo) => request(`/${entidad}`, { metodo: 'POST', cuerpo }),
  actualizar: (entidad, id, cuerpo) => request(`/${entidad}/${id}`, { metodo: 'PATCH', cuerpo }),
  eliminar: (entidad, id) => request(`/${entidad}/${id}`, { metodo: 'DELETE' }),
};

/** URL publica de una foto de usuario. */
export const urlFoto = (nombre) => (nombre ? `/uploads/photos/${nombre}` : null);