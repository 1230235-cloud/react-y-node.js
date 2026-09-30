import { Router } from 'express';
import authRoutes from './auth.routes.js';
import { catalogRouters } from './catalogs.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ estado: 'ok', uptime: Math.round(process.uptime()) });
});

router.use('/auth', authRoutes);

for (const [name, catalogRouter] of Object.entries(catalogRouters)) {
  router.use(`/${name}`, catalogRouter);
}

export default router;