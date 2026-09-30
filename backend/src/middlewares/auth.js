import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env.js';
import { queryOne } from '../config/db.js';
import { HttpError } from '../utils/httpError.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, rol: user.rol, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function setAuthCookie(res, token) {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: 1000 * 60 * 60 * 8,
  });
}

export function clearAuthCookie(res) {
  // Mismas opciones que al crear la cookie; si no coinciden el navegador
  // no la elimina.
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
  });
}

function extractToken(req) {
  const fromCookie = req.cookies?.[env.COOKIE_NAME];
  if (fromCookie) return fromCookie;

  // Fallback para clientes que no pueden usar cookies (tests, apps moviles).
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/**
 * Verifica el JWT y carga el usuario fresco desde la BD. Se relee en cada
 * peticion para que una baja o un cambio de rol surta efecto de inmediato
 * sin esperar a que expire el token.
 */
export async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(HttpError.unauthorized());

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    const expired = error instanceof jwt.TokenExpiredError;
    return next(HttpError.unauthorized(expired ? 'Sesion expirada' : 'Token invalido'));
  }

  const user = await queryOne(
    `SELECT id, nombre, email, rol, activo, foto, creado_en
       FROM usuarios WHERE id = ? LIMIT 1`,
    [payload.sub],
  );

  if (!user) return next(HttpError.unauthorized('Usuario no encontrado'));
  if (!user.activo) return next(HttpError.forbidden('Usuario desactivado'));

  req.user = user;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(HttpError.unauthorized());
    if (!roles.includes(req.user.rol)) {
      return next(HttpError.forbidden(`Se requiere rol: ${roles.join(' o ')}`));
    }
    next();
  };
}