import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrderBy, buildFilters, buildSearch } from '../src/services/crud.service.js';
import { catalogs, listQuerySchema } from '../src/config/catalogs.js';

test('buildOrderBy rechaza columnas fuera de la lista blanca', () => {
  const config = catalogs.usuarios;

  assert.equal(buildOrderBy(config, 'u.email', 'desc'), 'u.email DESC');
  // Sin coincidencia cae en el orden por defecto, nunca inyecta.
  assert.equal(buildOrderBy(config, 'email; DROP TABLE usuarios--', 'asc'), 'u.nombre ASC');
  assert.equal(buildOrderBy(config, undefined, 'asc'), 'u.nombre ASC');
  // La direccion tampoco se puede forzar.
  assert.equal(buildOrderBy(config, 'u.email', 'asc; SELECT 1'), 'u.email ASC');
});

test('buildFilters solo acepta claves declaradas en el catalogo', () => {
  const config = catalogs.grupos;

  const { clauses, values } = buildFilters(config, {
    grado: 3,
    turno: 'matutino',
    grupo_id: 9,
    'materia_id = 1 OR 1': 1,
  });

  assert.deepEqual(clauses, ['g.grado = ?', 'g.turno = ?']);
  assert.deepEqual(values, [3, 'matutino']);
});

test('buildFilters ignora valores vacios', () => {
  const { clauses, values } = buildFilters(catalogs.usuarios, { rol: undefined, activo: '' });
  assert.deepEqual(clauses, []);
  assert.deepEqual(values, []);
});

test('buildSearch enlaza un placeholder por columna buscable', () => {
  const config = catalogs.materias;

  const conQuery = buildSearch(config, 'mate');
  assert.equal(conQuery.sql, '(mt.nombre LIKE ? OR mt.codigo LIKE ?)');
  assert.deepEqual(conQuery.values, ['%mate%', '%mate%']);

  assert.deepEqual(buildSearch(config, undefined), { sql: '', values: [] });
});

test('cada filtro de catalogo es alcanzable desde listQuerySchema', () => {
  // Se miran las claves declaradas, no la salida parseada: zod omite del
  // resultado los opcionales que no llegaron en la peticion.
  const filterKeys = Object.keys(listQuerySchema.shape);

  for (const [name, config] of Object.entries(catalogs)) {
    for (const key of Object.keys(config.filters)) {
      assert.ok(filterKeys.includes(key), `${name}: el filtro "${key}" no existe en listQuerySchema`);
    }
    assert.ok(
      config.sortable.includes(config.defaultSort),
      `${name}: defaultSort "${config.defaultSort}" no esta en sortable`,
    );
  }
});

test('usuarios declara password_hash y no expone el campo plano', () => {
  const config = catalogs.usuarios;

  assert.ok(config.insertColumns.includes('password_hash'));
  assert.ok(!config.insertColumns.includes('password'));
  assert.ok(config.hooks?.hashPassword === true);
  assert.ok(!config.selectSql.includes('password_hash'));
});

test('cada catalogo declara roles de lectura y escritura coherentes', () => {
  const ROLES = ['admin', 'maestro', 'alumno'];

  for (const [name, config] of Object.entries(catalogs)) {
    assert.ok(config.rolesLectura?.length, `${name}: falta rolesLectura`);
    assert.ok(config.writeRoles?.length, `${name}: falta writeRoles`);

    for (const rol of [...config.rolesLectura, ...config.writeRoles]) {
      assert.ok(ROLES.includes(rol), `${name}: rol desconocido "${rol}"`);
    }

    // Escribir exige poder leer: si no, el router exigiria el rol de
    // escritura sin haber pasado nunca por el de lectura.
    for (const rol of config.writeRoles) {
      assert.ok(
        config.rolesLectura.includes(rol),
        `${name}: "${rol}" escribe pero no puede leer`,
      );
    }
  }

  // El catalogo de usuarios solo lo ve un admin: es el que contiene emails
  // y roles de toda la institucion.
  assert.deepEqual(catalogs.usuarios.rolesLectura, ['admin']);
  assert.deepEqual(catalogs.usuarios.writeRoles, ['admin']);

  // Ningun alumno accede a ningun catalogo.
  for (const config of Object.values(catalogs)) {
    assert.ok(!config.rolesLectura.includes('alumno'), 'un alumno no debe leer catalogos');
  }
});

test('los esquemas de catalogo rechazan payloads invalidos', () => {
  const grupos = catalogs.grupos.createSchema;

  assert.equal(grupos.safeParse({ materia_id: 1, grado: 9, seccion: 'A' }).success, false, 'grado fuera de 1-6');
  assert.equal(grupos.safeParse({ materia_id: 1, grado: 1, seccion: 'AB' }).success, false, 'seccion de varias letras');
  assert.equal(grupos.safeParse({ materia_id: 1, grado: 0, seccion: 'A' }).success, false, 'grado 0');

  const ok = grupos.safeParse({ materia_id: 2, grado: 3, seccion: ' b ' });
  assert.equal(ok.success, true);
  assert.equal(ok.data.seccion, 'B', 'normaliza la seccion a mayuscula');
  assert.equal(ok.data.turno, 'matutino', 'aplica el valor por defecto');
});