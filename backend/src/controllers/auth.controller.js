import * as authService from '../services/auth.service.js';
import { signToken, setAuthCookie, clearAuthCookie } from '../middlewares/auth.js';
import { body } from '../middlewares/validate.js';
import { HttpError } from '../utils/httpError.js';

export async function login(req, res) {
  const { email, password } = body(req);
  const user = await authService.verifyCredentials(email, password);
  setAuthCookie(res, signToken(user));
  // El token viaja solo en la cookie httpOnly; nunca en el cuerpo.
  res.json({ usuario: user });
}

export async function logout(req, res) {
  clearAuthCookie(res);
  res.status(200).json({ mensaje: 'Sesion cerrada' });
}

export async function me(req, res) {
  res.json({ usuario: req.user });
}

export async function foto(req, res) {
  if (!req.file) {
    throw HttpError.badRequest('No se recibio ningun archivo (campo multipart "foto")');
  }

  const { foto: filename } = await authService.attachPhoto(req.user.id, req.file.filename);
  res.status(201).json({ foto: filename, url: `/uploads/photos/${filename}` });
}

export async function password(req, res) {
  const { passwordActual, passwordNuevo } = body(req);
  await authService.changePassword(req.user.id, passwordActual, passwordNuevo);
  res.json({ mensaje: 'Contrasena actualizada' });
}