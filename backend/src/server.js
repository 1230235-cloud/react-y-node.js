import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[lab-escolar] API escuchando en http://localhost:${env.PORT}`);
  console.log(`[lab-escolar] entorno=${env.NODE_ENV} db=${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
});

let closing = false;

async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log(`\n[lab-escolar] ${signal} recibido, cerrando...`);

  server.close(async () => {
    await pool.end().catch(() => {});
    console.log('[lab-escolar] Servidor cerrado limpiamente');
    process.exit(0);
  });

  // Si alguna conexion se queda colgada, no esperamos indefinidamente.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));