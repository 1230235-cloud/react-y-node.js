import mysql from 'mysql2/promise';
import { env } from './env.js';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  timezone: 'Z',
  // TIMESTAMP/DATETIME llegan como 'YYYY-MM-DD HH:MM:SS' en lugar de Date
  // para no sufrir desfases de zona horaria al serializar a JSON.
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
  multipleStatements: false,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

/**
 * Ejecuta `fn` dentro de una transaccion. Hace commit si resuelve y
 * rollback si lanza. La conexion se devuelve al pool pase lo que pase.
 */
export async function withTransaction(fn) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await fn(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  await pool.end();
}