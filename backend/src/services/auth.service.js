import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../config/db.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';
import { PHOTOS_DIR } from '../middlewares/upload.js';

// Hash señuelo: si el email no existe se compara igualmente contra este valor
// para que el tiempo de respuesta no revele si el usuario esta registrado.
const DUMMY_HASH = bcrypt.hashSync('lab-escolar-senuelo', 10);

export async function verifyCredentials(email, password) {
  const user = await queryOne(
    `SELECT id, nombre, email, password_hash, rol, activo, foto
       FROM usuarios WHERE email = ? LIMIT 1`,
    [email],
  );

  const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  if (!user || !valid) throw HttpError.unauthorized('Credenciales invalidas');
  if (!user.activo) throw HttpError.forbidden('Usuario desactivado');

  const { password_hash, ...safeUser } = user;
  return safeUser;
}

export async function findById(id) {
  return queryOne(
    `SELECT id, nombre, email, rol, activo, foto, creado_en
       FROM usuarios WHERE id = ? LIMIT 1`,
    [id],
  );
}

export async function changePassword(userId, currentPassword, newPassword) {
  const row = await queryOne(`SELECT password_hash FROM usuarios WHERE id = ? LIMIT 1`, [userId]);
  if (!row) throw HttpError.notFound('Usuario no encontrado');

  const valid = await bcrypt.compare(currentPassword, row.password_hash);
  if (!valid) throw HttpError.unauthorized('La contrasena actual no es correcta');

  const hash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await query(`UPDATE usuarios SET password_hash = ? WHERE id = ?`, [hash, userId]);
}

/**
 * Guarda el nombre del archivo subido y borra el anterior del disco.
 * Los nombres los genera multer, pero se valida igualmente que el valor
 * no escape del directorio de fotos.
 */
export async function attachPhoto(userId, filename) {
  const previous = await queryOne(`SELECT foto FROM usuarios WHERE id = ? LIMIT 1`, [userId]);
  if (!previous) throw HttpError.notFound('Usuario no encontrado');

  await query(`UPDATE usuarios SET foto = ? WHERE id = ?`, [filename, userId]);

  if (previous.foto && previous.foto !== filename) {
    const target = path.resolve(PHOTOS_DIR, path.basename(previous.foto));
    if (target.startsWith(PHOTOS_DIR)) {
      await fs.unlink(target).catch(() => {});
    }
  }

  return { foto: filename };
}