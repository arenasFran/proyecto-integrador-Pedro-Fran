import express from 'express';
import rateLimit from 'express-rate-limit';
import { ServiceController } from '../controllers/service/ServiceController';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createServiceSchema, updateServiceSchema, serviceIdParamSchema } from '../validators/service.validator';

const servicesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes. Esperá un minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createServiceRouter = (deps: {
  serviceController: ServiceController;
  authenticate?: express.RequestHandler;
}) => {
  const router = express.Router();

  router.get('/', servicesLimiter, (req, res, next) => {
    if (req.query.includeInactive === 'true' || req.query.includeDeleted === 'true') {
      if (!deps.authenticate) {
        return res.status(401).json({ error: 'Autenticación requerida' });
      }
      return deps.authenticate(req, res, () => {
        authorize('Admin')(req, res, () => {
          deps.serviceController.getAllAdmin(req, res);
        });
      });
    }
    next();
  }, deps.serviceController.getAll);

  if (deps.authenticate) {
    router.use(deps.authenticate);

    router.post(
      '/',
      authorize('Admin'),
      validate({ body: createServiceSchema }),
      deps.serviceController.create
    );

    router.put(
      '/:id',
      authorize('Admin'),
      validate({ params: serviceIdParamSchema, body: updateServiceSchema }),
      deps.serviceController.update
    );

    router.delete(
      '/:id',
      authorize('Admin'),
      validate({ params: serviceIdParamSchema }),
      deps.serviceController.delete
    );

    router.patch(
      '/:id/restore',
      authorize('Admin'),
      validate({ params: serviceIdParamSchema }),
      deps.serviceController.restore
    );
  }

  return router;
};
