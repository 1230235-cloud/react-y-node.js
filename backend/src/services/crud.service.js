import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

// Las tres funciones de abajo son puras (no tocan la BD) para poder
// testearlas de forma aislada: son la unica puerta por la que un
// identificador de columna o tabla llega al SQL.

// sortBy nunca se interpola sin comprobar: solo se acepta si esta en la
// lista blanca del catalogo, y la direccion solo puede ser ASC o DESC.
export function buildOrderBy(config, sortBy, order) {
  const column = sortBy && config.sortable.includes(sortBy) ? sortBy : config.defaultSort;
  const direction = order === 'desc' ? 'DESC' : 'ASC';
  return `${column} ${direction}`;
}

export function buildFilters(config, params) {
  const clauses = [];
  const values = [];

  for (const [key, column] of Object.entries(config.filters)) {
    const value = params[key];
    if (value === undefined || value === null || value === '') continue;
    clauses.push(`${column} = ?`);
    values.push(value);
  }

  return { clauses, values };
}

export function buildSearch(config, q) {
  if (!q) return { sql: '', values: [] };

  const columns = config.searchable;
  const sql = `(${columns.map((column) => `${column} LIKE ?`).join(' OR ')})`;
  return { sql, values: columns.map(() => `%${q}%`) };
}

function buildWhere(config, params) {
  const search = buildSearch(config, params.q);
  const filters = buildFilters(config, params);
  const clauses = [search.sql, ...filters.clauses].filter(Boolean);
  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values: [...search.values, ...filters.values],
  };
}

/**
 * Fabrica de CRUD. `config` viene de src/config/catalogs.js y aporta los
 * identificadores validos; aqui solo se combinan con los valores ya
 * validados por zod, que viajan siempre como parametros enlazados (?).
 */
export function createCrudService(config) {
  async function getById(id) {
    const rows = await query(
      `SELECT ${config.selectSql} FROM ${config.fromSql} WHERE ${config.idColumn} = ? LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async function list(params) {
    const { page, limit, q, sortBy, order } = params;
    const { where, values } = buildWhere(config, params);

    // page/limit ya salen de zod como enteros positivos acotados, asi que
    // interpolarlos es seguro y evita el problema de LIMIT con placeholders
    // en sentencias preparadas.
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT ${config.selectSql}
         FROM ${config.fromSql}
         ${where}
        ORDER BY ${buildOrderBy(config, sortBy, order)}
        LIMIT ${limit} OFFSET ${offset}`,
      values,
    );

    const totalRows = await query(
      `SELECT COUNT(*) AS total FROM ${config.fromSql} ${where}`,
      values,
    );

    const total = Number(totalRows[0]?.total ?? 0);

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async function create(data) {
    let row = { ...data };

    // `password` es virtual: llega del cliente pero nunca se guarda en claro.
    if (config.hooks?.hashPassword) {
      const { password, ...rest } = row;
      row = { ...rest, password_hash: await bcrypt.hash(password, env.BCRYPT_ROUNDS) };
    }

    const columns = config.insertColumns.filter((column) => row[column] !== undefined);
    if (columns.length === 0) throw HttpError.badRequest('No hay datos para insertar');

    const result = await query(
      `INSERT INTO ${config.table} (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      columns.map((column) => row[column]),
    );

    return getById(result.insertId);
  }

  async function update(id, data) {
    const columns = config.updateColumns.filter((column) => data[column] !== undefined);
    if (columns.length === 0) throw HttpError.badRequest('No hay campos para actualizar');

    const result = await query(
      `UPDATE ${config.table}
          SET ${columns.map((column) => `${column} = ?`).join(', ')}
        WHERE id = ?`,
      [...columns.map((column) => data[column]), id],
    );

    if (result.affectedRows === 0) throw HttpError.notFound('Registro no encontrado');
    return getById(id);
  }

  async function remove(id) {
    const result = await query(`DELETE FROM ${config.table} WHERE id = ?`, [id]);
    if (result.affectedRows === 0) throw HttpError.notFound('Registro no encontrado');
  }

  return { list, getById, create, update, remove };
}