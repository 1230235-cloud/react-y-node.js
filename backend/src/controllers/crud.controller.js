import { HttpError } from '../utils/httpError.js';
import { body, params, query } from '../middlewares/validate.js';

/**
 * Fabrica de controllers CRUD. Recibe el service ya construido a partir de
 * la configuracion del catalogo y devuelve los cinco handlers.
 */
export function createCrudController(service) {
  return {
    list: async (req, res) => {
      const result = await service.list(query(req));
      res.json(result);
    },

    get: async (req, res) => {
      const { id } = params(req);
      const row = await service.getById(id);
      if (!row) throw HttpError.notFound('Registro no encontrado');
      res.json({ data: row });
    },

    create: async (req, res) => {
      const row = await service.create(body(req));
      res.status(201).json({ data: row });
    },

    update: async (req, res) => {
      const { id } = params(req);
      const row = await service.update(id, body(req));
      res.json({ data: row });
    },

    remove: async (req, res) => {
      const { id } = params(req);
      await service.remove(id);
      res.status(204).send();
    },
  };
}