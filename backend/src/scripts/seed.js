import bcrypt from 'bcryptjs';
import { query, queryOne, closePool } from '../config/db.js';
import { env } from '../config/env.js';

// El trigger trg_usuarios_* permite exactamente 2 administradores, asi que
// estas dos cuentas son las que llenan esa cuota.
//
// No se usa INSERT ... ON DUPLICATE KEY UPDATE a proposito: en MariaDB el
// trigger BEFORE INSERT se evalua antes de detectar la clave duplicada, asi
// que el segundo `npm run seed` seria rechazado por la regla de los admins.
// Por eso primero se consulta si la cuenta ya existe.
const CUENTAS = [
  { nombre: 'Administrador', email: 'admin@lab.local', password: '$3cr3t' },
  { nombre: 'Root', email: 'root@lab.local', password: 'W@t@SHi09' },
];

async function seed() {
  for (const cuenta of CUENTAS) {
    const hash = await bcrypt.hash(cuenta.password, env.BCRYPT_ROUNDS);
    const existente = await queryOne(`SELECT id, rol FROM usuarios WHERE email = ? LIMIT 1`, [
      cuenta.email,
    ]);

    if (existente) {
      await query(
        `UPDATE usuarios
            SET nombre = ?, password_hash = ?, rol = 'admin', activo = 1
          WHERE id = ?`,
        [cuenta.nombre, hash, existente.id],
      );
      console.log(`[seed] admin actualizado: ${cuenta.email} (id=${existente.id})`);
    } else {
      await query(
        `INSERT INTO usuarios (nombre, email, password_hash, rol, activo)
         VALUES (?, ?, ?, 'admin', 1)`,
        [cuenta.nombre, cuenta.email, hash],
      );
      console.log(`[seed] admin creado: ${cuenta.email}`);
    }
  }

  const rows = await query(
    `SELECT email, rol, activo FROM usuarios WHERE rol = 'admin' ORDER BY email`,
  );
  console.log(`[seed] administradores en la base: ${rows.length}`);
  for (const row of rows) {
    console.log(`[seed]   - ${row.email} (rol=${row.rol}, activo=${row.activo})`);
  }
}

try {
  await seed();
  console.log('[seed] Completado');
} catch (error) {
  console.error('[seed] Error:', error.sqlMessage ?? error.message);
  process.exitCode = 1;
} finally {
  await closePool().catch(() => {});
}