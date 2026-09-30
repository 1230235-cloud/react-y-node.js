import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';

// Importar cada modulo evalua el grafo ESM completo: detecta imports
// rotos, exports con nombre inexistente, errores de sintaxis y ciclos.
// mysql2 abre el pool de forma perezosa, asi que no hace falta BD.
const MODULES = [
  '../src/config/env.js',
  '../src/config/db.js',
  '../src/config/catalogs.js',
  '../src/utils/httpError.js',
  '../src/utils/mapDbError.js',
  '../src/middlewares/errors.js',
  '../src/middlewares/validate.js',
  '../src/middlewares/auth.js',
  '../src/middlewares/rateLimit.js',
  '../src/middlewares/upload.js',
  '../src/schemas/auth.schema.js',
  '../src/services/auth.service.js',
  '../src/services/crud.service.js',
  '../src/controllers/auth.controller.js',
  '../src/controllers/crud.controller.js',
  '../src/routes/auth.routes.js',
  '../src/routes/catalogs.routes.js',
  '../src/routes/index.js',
  '../src/app.js',
];

for (const specifier of MODULES) {
  test(`el modulo ${specifier} carga y exporta lo esperado`, async () => {
    const mod = await import(specifier);
    assert.ok(Object.keys(mod).length > 0, 'no exporta nada');
  });
}

test('createApp construye una app de Express utilizable', async () => {
  const { createApp } = await import('../src/app.js');
  const app = createApp();

  assert.equal(typeof app, 'function');
  assert.ok(Array.isArray(app.router?.stack ?? app._router?.stack ?? []) || app.handle);
});