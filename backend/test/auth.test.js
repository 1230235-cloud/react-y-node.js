import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { signToken, setAuthCookie, clearAuthCookie } from '../src/middlewares/auth.js';
import { env } from '../src/config/env.js';

// Stub minimo de un res de Express que solo captura lo que se le pasa.
function fakeRes() {
  const cookies = [];
  return {
    cookies,
    cookie: (name, value, options) => cookies.push({ name, value, options }),
    clearCookie: (name, options) => cookies.push({ name, value: '', options, cleared: true }),
  };
}

test('signToken emite un JWT con la carga esperada', () => {
  const token = signToken({ id: 7, rol: 'admin', email: 'admin@lab.local' });
  const payload = jwt.verify(token, env.JWT_SECRET);

  assert.equal(payload.sub, 7);
  assert.equal(payload.rol, 'admin');
  assert.equal(payload.email, 'admin@lab.local');
  assert.ok(payload.exp > payload.iat);
});

test('un token firmado con otro secreto no valida', () => {
  const ajeno = jwt.sign({ sub: 1, rol: 'admin' }, 'otro_secreto_totalmente_distinto_12345');
  assert.throws(() => jwt.verify(ajeno, env.JWT_SECRET));
});

test('la cookie de sesion es httpOnly y SameSite=Strict', () => {
  const res = fakeRes();
  setAuthCookie(res, 'token-falso');

  const [cookie] = res.cookies;
  assert.equal(cookie.name, env.COOKIE_NAME);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, 'strict');
  assert.equal(cookie.options.path, '/');
  // NODE_ENV=test => secure:false, para que funcione sobre http en local.
  assert.equal(cookie.options.secure, false);
});

test('clearCookie usa las mismas opciones con las que se creo', () => {
  const res = fakeRes();
  setAuthCookie(res, 'token-falso');
  clearAuthCookie(res);

  const [set, cleared] = res.cookies;
  assert.equal(cleared.cleared, true);
  // Si httpOnly/sameSite/path difieren, el navegador ignora el borrado.
  assert.equal(cleared.options.httpOnly, set.options.httpOnly);
  assert.equal(cleared.options.sameSite, set.options.sameSite);
  assert.equal(cleared.options.path, set.options.path);
});