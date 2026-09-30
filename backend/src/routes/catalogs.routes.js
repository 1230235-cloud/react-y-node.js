import { Router } from 'express';
import { catalogs, listQuerySchema } from '../config/catalogs.js';
import { createCrudService } from '../services/crud.service.js';
import { createCrudController } from '../controllers/crud.controller.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { idParamSchema } from '../schemas/auth.schema.js';

function buildRouter(config) {
  const router = Router();
  const controller = createCrudController(createCrudService(config));
  const write = requireRole(...config.writeRoles);

  // El rol se comprueba en el servidor, no solo ocultando botones en el
  // frontend: restringir la UI no es una frontera de seguridad.
  router.use(requireAuth, requireRole(...config.rolesLectura));

  router.get('/', validate({ query: listQuerySchema }), controller.list);
  router.get('/:id', validate({ params: idParamSchema }), controller.get);

  router.post('/', write, validate({ body: config.createSchema }), controller.create);
  router.patch(
    '/:id',
    write,
    validate({ params: idParamSchema, body: config.updateSchema }),
    controller.update,
  );
  router.delete('/:id', write, validate({ params: idParamSchema }), controller.remove);

  return router;
}

/** Un router por catalogo, listo para montar en /api/<nombre>. */
export const catalogRouters = Object.fromEntries(
  Object.entries(catalogs).map(([name, config]) => [name, buildRouter(config)]),
);