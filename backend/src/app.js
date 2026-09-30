import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { notFoundHandler, errorHandler } from './middlewares/errors.js';

export function createApp() {
  const app = express();

  // Detras de un proxy inverso (nginx) req.ip debe usar X-Forwarded-For,
  // de lo contrario el rate limit se aplica a toda la red como una sola IP.
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(cookieParser());

  app.use('/uploads', express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
    maxAge: '1d',
    index: false,
    dotfiles: 'deny',
  }));

  app.use('/api', apiLimiter, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}