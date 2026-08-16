import express from 'express';
import rateLimit from 'express-rate-limit';
import { ClientController } from '../controllers/client/ClientController';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { clientIdParamSchema, sancionarClienteSchema } from '../validators/client.validator';

const sanctionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas operaciones de sanción. Esperá un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createClientRouter = (deps: {
  authenticate: express.RequestHandler;
  clientController: ClientController;
}) => {
  const router = express.Router({ mergeParams: true });

  router.patch(
    '/:id/sancion',
    deps.authenticate,
    authorize('Admin'),
    sanctionLimiter,
    validate({ params: clientIdParamSchema, body: sancionarClienteSchema }),
    deps.clientController.sancionar
  );

  router.patch(
    '/:id/sancion/levantar',
    deps.authenticate,
    authorize('Admin'),
    sanctionLimiter,
    validate({ params: clientIdParamSchema }),
    deps.clientController.levantar
  );

  return router;
};
