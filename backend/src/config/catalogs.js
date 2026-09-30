import { z } from 'zod';
import { passwordField } from '../schemas/auth.schema.js';

const id = z.coerce.number().int().positive();
const requiredString = (max, label) => z.string().trim().min(1, `${label} es obligatorio`).max(max);

// Rangos reutilizables, con mensajes en castellano para no mezclar idioma
// con el resto de la API.
const grado = z.coerce
  .number()
  .int('El grado debe ser un numero entero')
  .min(1, 'El grado debe estar entre 1 y 6')
  .max(6, 'El grado debe estar entre 1 y 6');

const cupo = z.coerce
  .number()
  .int('El cupo debe ser un numero entero')
  .min(1, 'El cupo debe estar entre 1 y 60')
  .max(60, 'El cupo debe estar entre 1 y 60');

export const ROLES = ['admin', 'maestro', 'alumno'];

/** Parametros de paginacion/orden compartidos por todos los catalogos. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
  q: z.string().trim().max(120).optional(),
  sortBy: z.string().trim().max(60).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  grupo_id: z.coerce.number().int().positive().optional(),
  materia_id: id.optional(),
  maestro_id: id.optional(),
  usuario_id: id.optional(),
  rol: z.enum(ROLES).optional(),
  grado: z.coerce.number().int().min(1).max(6).optional(),
  turno: z.enum(['matutino', 'vespertino']).optional(),
  activo: z.coerce.number().int().min(0).max(1).optional(),
});

/**
 * Configuracion de cada catalogo. Es la unica fuente de verdad que consumen
 * el service, el controller y las rutas.
 *
 * `fromSql` / `selectSql` son SQL fijo escrito a mano; los identificadores
 * variables (orden, filtros) solo se aceptan si aparecen en las listas
 * blancas de este archivo.
 */
export const catalogs = {
  usuarios: {
    table: 'usuarios',
    fromSql: 'usuarios u',
    idColumn: 'u.id',
    selectSql: 'u.id, u.nombre, u.email, u.rol, u.activo, u.foto, u.creado_en',
    insertColumns: ['nombre', 'email', 'password_hash', 'rol', 'activo'],
    updateColumns: ['nombre', 'email', 'rol', 'activo'],
    searchable: ['u.nombre', 'u.email'],
    sortable: ['u.id', 'u.nombre', 'u.email', 'u.rol', 'u.activo', 'u.creado_en'],
    filters: { rol: 'u.rol', activo: 'u.activo', usuario_id: 'u.id' },
    defaultSort: 'u.nombre',
    createSchema: z.object({
      nombre: requiredString(80, 'nombre'),
      email: z.email('Email invalido').max(120),
      password: passwordField,
      rol: z.enum(ROLES).default('alumno'),
      activo: z.coerce.number().int().min(0).max(1).default(1),
    }),
    updateSchema: z.object({
      nombre: requiredString(80, 'nombre').optional(),
      email: z.email('Email invalido').max(120).optional(),
      rol: z.enum(ROLES).optional(),
      activo: z.coerce.number().int().min(0).max(1).optional(),
    }),
    // La contrasena nunca viaja al cliente ni se edita por este endpoint.
    hooks: { hashPassword: true },
    rolesLectura: ['admin'],
    writeRoles: ['admin'],
  },

  maestros: {
    table: 'maestros',
    fromSql: `maestros m
              JOIN usuarios u ON u.id = m.usuario_id`,
    idColumn: 'm.id',
    selectSql: `m.id, m.usuario_id, m.numero_empleado, m.especialidad, m.creado_en,
                u.nombre, u.email, u.rol, u.activo`,
    insertColumns: ['usuario_id', 'numero_empleado', 'especialidad'],
    updateColumns: ['usuario_id', 'numero_empleado', 'especialidad'],
    searchable: ['u.nombre', 'u.email', 'm.numero_empleado', 'm.especialidad'],
    sortable: ['m.id', 'm.numero_empleado', 'u.nombre', 'm.especialidad', 'm.creado_en'],
    filters: { usuario_id: 'm.usuario_id' },
    defaultSort: 'u.nombre',
    createSchema: z.object({
      usuario_id: id,
      numero_empleado: requiredString(20, 'numero_empleado'),
      especialidad: z.string().trim().max(100).optional().nullable(),
    }),
    updateSchema: z.object({
      usuario_id: id.optional(),
      numero_empleado: requiredString(20, 'numero_empleado').optional(),
      especialidad: z.string().trim().max(100).optional().nullable(),
    }),
    rolesLectura: ['admin', 'maestro'],
    writeRoles: ['admin'],
  },

  materias: {
    table: 'materias',
    fromSql: 'materias mt',
    idColumn: 'mt.id',
    selectSql: 'mt.id, mt.nombre, mt.codigo, mt.creado_en',
    insertColumns: ['nombre', 'codigo'],
    updateColumns: ['nombre', 'codigo'],
    searchable: ['mt.nombre', 'mt.codigo'],
    sortable: ['mt.id', 'mt.nombre', 'mt.codigo', 'mt.creado_en'],
    filters: {},
    defaultSort: 'mt.nombre',
    createSchema: z.object({
      nombre: requiredString(100, 'nombre'),
      codigo: requiredString(20, 'codigo'),
    }),
    updateSchema: z.object({
      nombre: requiredString(100, 'nombre').optional(),
      codigo: requiredString(20, 'codigo').optional(),
    }),
    rolesLectura: ['admin', 'maestro'],
    writeRoles: ['admin'],
  },

  grupos: {
    table: 'grupos',
    fromSql: `grupos g
              JOIN materias mt ON mt.id = g.materia_id
              LEFT JOIN maestros m ON m.id = g.maestro_id
              LEFT JOIN usuarios mu ON mu.id = m.usuario_id`,
    idColumn: 'g.id',
    selectSql: `g.id, g.materia_id, g.maestro_id, g.grado, g.seccion, g.turno,
                g.cupo, g.creado_en,
                mt.nombre AS materia, mt.codigo AS materia_codigo,
                mu.nombre AS maestro`,
    insertColumns: ['materia_id', 'maestro_id', 'grado', 'seccion', 'turno', 'cupo'],
    updateColumns: ['materia_id', 'maestro_id', 'grado', 'seccion', 'turno', 'cupo'],
    searchable: ['mt.nombre', 'mt.codigo', 'mu.nombre'],
    sortable: ['g.id', 'mt.nombre', 'g.grado', 'g.seccion', 'g.turno', 'g.creado_en'],
    filters: { materia_id: 'g.materia_id', maestro_id: 'g.maestro_id', grado: 'g.grado', turno: 'g.turno' },
    defaultSort: 'mt.nombre',
    createSchema: z.object({
      materia_id: id,
      maestro_id: id.optional().nullable(),
      grado,
      seccion: z.string().trim().toUpperCase().length(1, 'La seccion es una sola letra'),
      turno: z.enum(['matutino', 'vespertino']).default('matutino'),
      cupo: cupo.default(30),
    }),
    updateSchema: z.object({
      materia_id: id.optional(),
      maestro_id: id.optional().nullable(),
      grado: grado.optional(),
      seccion: z.string().trim().toUpperCase().length(1).optional(),
      turno: z.enum(['matutino', 'vespertino']).optional(),
      cupo: cupo.optional(),
    }),
    rolesLectura: ['admin', 'maestro'],
    writeRoles: ['admin', 'maestro'],
  },

  alumnos: {
    table: 'alumnos',
    fromSql: `alumnos a
              JOIN usuarios u ON u.id = a.usuario_id
              LEFT JOIN grupos g ON g.id = a.grupo_id
              LEFT JOIN materias mt ON mt.id = g.materia_id`,
    idColumn: 'a.id',
    selectSql: `a.id, a.usuario_id, a.grupo_id, a.matricula, a.creado_en,
                u.nombre, u.email, u.activo,
                g.grado, g.seccion, mt.nombre AS materia`,
    insertColumns: ['usuario_id', 'grupo_id', 'matricula'],
    updateColumns: ['usuario_id', 'grupo_id', 'matricula'],
    searchable: ['u.nombre', 'u.email', 'a.matricula'],
    sortable: ['a.id', 'a.matricula', 'u.nombre', 'a.creado_en'],
    filters: { grupo_id: 'a.grupo_id', usuario_id: 'a.usuario_id' },
    defaultSort: 'u.nombre',
    createSchema: z.object({
      usuario_id: id,
      grupo_id: id.optional().nullable(),
      matricula: requiredString(20, 'matricula'),
    }),
    updateSchema: z.object({
      usuario_id: id.optional(),
      grupo_id: id.optional().nullable(),
      matricula: requiredString(20, 'matricula').optional(),
    }),
    rolesLectura: ['admin', 'maestro'],
    writeRoles: ['admin', 'maestro'],
  },
};

export const catalogNames = Object.keys(catalogs);