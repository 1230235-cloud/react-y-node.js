// `npm test` corre sin --env-file, y src/config/env.js aborta el proceso
// si faltan variables. Este modulo se importa antes que el codigo bajo
// prueba (ESM evalua los imports en orden) y les da valores de mentira.
// mysql2 abre el pool de forma perezosa, asi que no hace falta una BD real.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DB_USER = process.env.DB_USER ?? 'lab_app';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'test';
process.env.DB_NAME = process.env.DB_NAME ?? 'lab_escolar';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'secreto_de_pruebas_de_treinta_y_dos_caracteres';