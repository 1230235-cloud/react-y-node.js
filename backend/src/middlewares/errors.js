import { HttpError } from '../utils/httpError.js';
import { mapDbError } from '../utils/mapDbError.js';

export function notFoundHandler(req, res, next) {
  next(HttpError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Express 5 propaga automaticamente los rechazos de handlers async, asi que
// cualquier `throw` que escape de un controller acaba aqui.
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const mapped = mapDbError(error);
  const isHttp = mapped instanceof HttpError;
  const status = isHttp ? mapped.status : 500;

  if (!isHttp) {
    console.error('[error]', req.method, req.originalUrl, '-', mapped);
  }

  const body = {
    error: isHttp ? mapped.message : 'Error interno del servidor',
  };

  if (isHttp && mapped.details) body.details = mapped.details;

  res.status(status).json(body);
}