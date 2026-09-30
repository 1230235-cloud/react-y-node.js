import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
]);

export const PHOTOS_DIR = path.resolve(process.cwd(), env.UPLOAD_DIR, 'photos');

fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PHOTOS_DIR),
  // Nombre generado: nunca se reutiliza el que envia el cliente.
  // La extension sale del mimetype ya verificado, no del filename.
  filename: (req, file, cb) => {
    const ext = ALLOWED.get(file.mimetype) ?? '.bin';
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  },
});

export const uploadPhoto = multer({
  storage,
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(HttpError.unprocessable('Formato no permitido. Usa JPEG, PNG o WEBP'));
    }
    cb(null, true);
  },
});

/** Convierte los errores propios de multer en HttpError. */
export function handleUploadError(error, req, res, next) {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const mb = Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024));
      return next(HttpError.payloadTooLarge(`El archivo supera el maximo de ${mb} MB`));
    }
    return next(HttpError.unprocessable(`Error de subida: ${error.message}`));
  }
  next(error);
}