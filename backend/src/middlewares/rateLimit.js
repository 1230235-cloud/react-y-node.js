import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

function jsonHandler(message) {
  return (req, res, next, options) => {
    res.status(options.statusCode).json({ error: message });
  };
}

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

/** Limite global de la API. */
export const apiLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  handler: jsonHandler('Demasiadas peticiones, intentalo de nuevo mas tarde'),
});

/** Limite estricto para login: frena fuerza bruta. */
export const authLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
  handler: jsonHandler('Demasiados intentos de inicio de sesion'),
});

/** Limite para subida de fotos. */
export const uploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: env.UPLOAD_RATE_LIMIT_MAX,
  handler: jsonHandler('Demasiadas subidas, intentalo de nuevo mas tarde'),
});