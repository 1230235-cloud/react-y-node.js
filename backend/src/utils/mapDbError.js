import { HttpError } from './httpError.js';

const DUPLICATE_ENTRY = 1062;
const NO_REFERENCED_ROW = 1452;
const ROW_IS_REFERENCED = 1451;
const TRIGGER_SIGNAL = 1644;

function duplicateEntryMessage(error) {
  // MariaDB: "Duplicate entry 'admin@lab.local' for key 'uq_usuarios_email'"
  const key = error.sqlMessage?.match(/for key '([^']+)'/)?.[1] ?? error.message?.match(/for key '([^']+)'/)?.[1];
  if (!key) return 'Ya existe un registro con ese valor';

  // Las claves uniques se nombran uq_<tabla>_<columnas>: se quita el
  // prefijo y, si aun queda un guion bajo, tambien el nombre de la tabla.
  let column = key.replace(/^(uq|uk|idx)_/, '');
  if (column.includes('_')) column = column.replace(/^[^_]+_/, '');

  return `Ya existe un registro con ese valor (campo "${column || key}")`;
}

/**
 * Traduce los errores de MariaDB a HttpError con un status coherente, para
 * que los controllers no tengan que conocer codigos de MySQL.
 */
export function mapDbError(error) {
  if (error instanceof HttpError) return error;

  const errno = error?.errno ?? (Number(error?.code) || null);

  // SIGNAL SQLSTATE '45000' emitido por los triggers de la regla de admins.
  if (errno === TRIGGER_SIGNAL || error?.sqlState === '45000') {
    return HttpError.conflict(error.sqlMessage ?? error.message ?? 'Regla de negocio violada');
  }

  switch (errno) {
    case DUPLICATE_ENTRY:
      return HttpError.conflict(duplicateEntryMessage(error));
    case NO_REFERENCED_ROW:
      return HttpError.unprocessable('Referencia invalida: el registro relacionado no existe');
    case ROW_IS_REFERENCED:
      return HttpError.conflict('No se puede eliminar: hay registros que dependen de este');
    default:
      return error;
  }
}