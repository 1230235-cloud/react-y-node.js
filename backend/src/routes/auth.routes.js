import { Router } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import { uploadPhoto, handleUploadError } from '../middlewares/upload.js';
import { authLimiter, uploadLimiter } from '../middlewares/rateLimit.js';
import { loginSchema, changePasswordSchema } from '../schemas/auth.schema.js';

const router = Router();

router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
router.post('/logout', controller.logout);

router.get('/me', requireAuth, controller.me);

// multer corre antes del controller; handleUploadError traduce sus errores
// (LIMITE_FILE_SIZE, etc.) al formato de error de la API.
router.post(
  '/foto',
  requireAuth,
  uploadLimiter,
  uploadPhoto.single('foto'),
  handleUploadError,
  controller.foto,
);

router.patch(
  '/password',
  requireAuth,
  authLimiter,
  validate({ body: changePasswordSchema }),
  controller.password,
);

export default router;