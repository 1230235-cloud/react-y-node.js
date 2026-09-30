import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema, changePasswordSchema } from '../src/schemas/auth.schema.js';
import { mapDbError } from '../src/utils/mapDbError.js';
import { HttpError } from '../src/utils/httpError.js';

test('loginSchema exige email valido y contrasena no vacia', () => {
  assert.equal(loginSchema.safeParse({ email: 'admin@lab.local', password: 'x' }).success, true);
  assert.equal(loginSchema.safeParse({ email: 'no-es-email', password: 'x' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success, false);
  assert.equal(loginSchema.safeParse({ email: 'a@b.com' }).success, false);
});

test('changePasswordSchema aplica la politica de contrasena', () => {
  const base = { passwordActual: 'vieja123', passwordNuevo: 'nueva123' };

  assert.equal(changePasswordSchema.safeParse(base).success, true);
  assert.equal(changePasswordSchema.safeParse({ ...base, passwordNuevo: 'corta1' }).success, false, 'menos de 8');
  assert.equal(changePasswordSchema.safeParse({ ...base, passwordNuevo: 'solo_letras' }).success, false, 'sin numero');
  assert.equal(changePasswordSchema.safeParse({ ...base, passwordNuevo: '12345678' }).success, false, 'sin letra');
  assert.equal(changePasswordSchema.safeParse({ ...base, passwordNuevo: 'a'.repeat(73) }).success, false, 'mas de 72');
});

test('mapDbError traduce duplicados a 409', () => {
  const mapped = mapDbError({
    errno: 1062,
    sqlMessage: "Duplicate entry 'admin@lab.local' for key 'usuarios.email'",
  });

  assert.equal(mapped.status, 409);
  assert.match(mapped.message, /email/);
});

test('mapDbError traduce el SIGNAL de los triggers a 409', () => {
  const mapped = mapDbError({
    errno: 1644,
    sqlState: '45000',
    sqlMessage: 'Regla de negocio: solo existen 2 administradores.',
  });

  assert.equal(mapped.status, 409);
  assert.match(mapped.message, /2 administradores/);
});

test('mapDbError traduce claves foraneas', () => {
  assert.equal(mapDbError({ errno: 1452 }).status, 422, 'FK padre inexistente');
  assert.equal(mapDbError({ errno: 1451 }).status, 409, 'FK hijo bloquea el borrado');
});

test('mapDbError deja pasar lo que no conoce y respeta HttpError', () => {
  const desconocido = new Error('boom');
  assert.equal(mapDbError(desconocido), desconocido);

  const original = HttpError.unauthorized('Sesion expirada');
  assert.equal(mapDbError(original), original);
});