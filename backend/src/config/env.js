import { z } from 'zod';

// z.coerce.boolean() convierte la cadena "false" en true (Boolean("false") === true),
// asi que los booleanos de entorno se normalizan aqui a mano.
const boolFromEnv = z.preprocess((value) => {
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  return value;
}, z.boolean());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  TRUST_PROXY: boolFromEnv.default(false),

  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1, 'DB_USER es obligatorio'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('lab_escolar'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET debe tener al menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  COOKIE_NAME: z.string().min(1).default('lab_token'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(10),

  UPLOAD_DIR: z.string().min(1).default('uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(2 * 1024 * 1024),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  console.error(`[config] Variables de entorno invalidas:\n${issues}`);
  console.error('[config] Copia .env.example a .env y ajustalo antes de arrancar.');
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';