import { HttpError } from '../utils/httpError.js';

/**
 * Valida req.body / req.query / req.params con zod y deja el resultado
 * limpio en req.validated.
 *
 * Express 5 define req.query como getter de solo lectura, por eso el
 * resultado no se escribe de vuelta en req.query sino en req.validated.
 */
export function validate(schemas) {
  return (req, res, next) => {
    req.validated = {};

    for (const source of ['params', 'query', 'body']) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          campo: issue.path.join('.') || '(raiz)',
          mensaje: issue.message,
        }));
        return next(HttpError.unprocessable(`Datos invalidos en "${source}"`, details));
      }

      req.validated[source] = result.data;
    }

    next();
  };
}

/** Acceso comodo: req.validated.body.nombre */
export const body = (req) => req.validated?.body ?? {};
export const query = (req) => req.validated?.query ?? {};
export const params = (req) => req.validated?.params ?? {};