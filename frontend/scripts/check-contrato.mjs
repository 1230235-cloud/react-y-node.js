/**
 * Comprueba que el contrato entre frontend y backend no se rompa.
 *
 * Los dos proyectos son carpetas hermanas con copias propias de la
 * descripcion de los catalogos, asi que pueden desincronizarse sin que
 * nada falle hasta que un desplegable devuelve 422. Este script lee la
 * lista blanca real del backend y valida el lado del frontend.
 *
 *   node scripts/check-contrato.mjs
 *
 * Si el backend no esta disponible solo avisa y sale con codigo 0, para
 * que el frontend siga siendo autonomous.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raizFrontend = path.resolve(aqui, '..');
const rutaBackend = path.resolve(raizFrontend, '../backend');

const problemas = [];
const avisar = (mensaje) => problemas.push(mensaje);

// El limite por pagina que usa el frontend al rellenar selectores FK.
const LIMITE_SELECTOR = Number(
  fs
    .readFileSync(path.join(raizFrontend, 'src/components/CrudPage.jsx'), 'utf8')
    .match(/const LIMITE_MAXIMO = (\d+)/)?.[1] ?? NaN,
);

const rutasBackend = {
  catalogs: path.join(rutaBackend, 'src/config/catalogs.js'),
};

const faltaBackend = Object.values(rutasBackend).some((ruta) => !fs.existsSync(ruta));
if (faltaBackend) {
  console.log('[contrato] Backend no encontrado, se omite la comprobacion.');
  process.exit(0);
}

// Se importa el config real del backend para leer listas blancas y schemas.
const { catalogs: backendCatalogs, listQuerySchema } = await import(
  path.join(rutaBackend, 'src/config/catalogs.js')
);
const { ENTIDADES: frontendEntidades } = await import(
  path.join(raizFrontend, 'src/config/entidades.js')
);

// El limite real lo fija el schema zod del backend. Se deduce probando la
// API publica en vez de leer los internos del schema, que cambian entre
// versiones de zod (en 4.6 el tope se llama 'less_than', no 'max').
function limiteMaximo(schema, techo = 500) {
  let maximo = 0;
  for (let n = 1; n <= techo; n += 1) {
    if (!schema.safeParse({ limit: n }).success) break;
    maximo = n;
  }
  return maximo;
}

const maximo = limiteMaximo(listQuerySchema);

if (maximo > 0 && LIMITE_SELECTOR > maximo) {
  avisar(
    `CrudPage pide limit=${LIMITE_SELECTOR} pero el backend solo admite ${maximo} (422 en cada selector FK)`,
  );
}

// Cada columna ordenable debe usar una clave de la lista blanca del backend,
// o el servidor cae silenciosamente al orden por defecto.
for (const [nombre, entidad] of Object.entries(frontendEntidades)) {
  const backend = backendCatalogs[nombre];
  if (!backend) {
    avisar(`Frontend define "${nombre}" pero el backend no tiene ese catalogo`);
    continue;
  }

  if (!backend.sortable.includes(entidad.ordenDefecto)) {
    avisar(`${nombre}: ordenDefecto "${entidad.ordenDefecto}" no esta en la lista blanca`);
  }

  for (const columna of entidad.columnas) {
    if (columna.orden && !backend.sortable.includes(columna.orden)) {
      avisar(
        `${nombre}: la columna "${columna.clave}" ordena por "${columna.orden}", que no esta en la lista blanca`,
      );
    }
  }

  // Los filtros de tabla deben existir en el esquema de query del backend.
  for (const clave of Object.keys(backend.filters ?? {})) {
    if (!(clave in listQuerySchema.shape)) {
      avisar(`${nombre}: el filtro "${clave}" no existe en listQuerySchema`);
    }
  }
}

// Los selectores FK apuntan a endpoints que deben existir en ambos lados.
for (const [nombre, entidad] of Object.entries(frontendEntidades)) {
  for (const campo of entidad.campos) {
    const fuente = campo.fuente?.endpoint;
    if (!fuente) continue;
    if (!frontendEntidades[fuente]) {
      avisar(`${nombre}.${campo.name}: el selector apunta a "${fuente}", que no existe en el frontend`);
    }
    if (!backendCatalogs[fuente]) {
      avisar(`${nombre}.${campo.name}: el selector apunta a "${fuente}", que no existe en el backend`);
    }
  }
}

if (problemas.length > 0) {
  console.error('[contrato] Desajustes entre frontend y backend:');
  for (const problema of problemas) console.error(`  - ${problema}`);
  process.exit(1);
}

console.log(
  `[contrato] OK: ${Object.keys(frontendEntidades).length} catalogos coherentes con el backend (limit selector <= ${maximo ?? '?'})`,
);