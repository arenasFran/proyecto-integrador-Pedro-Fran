import express from 'express';
import { BarberController } from '../controllers/barber/BarberController';
import { authorize, authorizeSelfOrKinds } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  barberIdParamSchema,
  blockIdParamSchema,
  blockQuerySchema,
  createBarberSchema,
  createBlockSchema,
  scheduleSchema,
  slotsQuerySchema,
  updateBarberSchema,
  updateBarberMeSchema,
} from '../validators/barber.validator';

export const createBarberRouter = (deps: {
  barberController: BarberController;
  authenticate: express.RequestHandler;
}) => {
  const router = express.Router({ mergeParams: true });

  router.get('/public', deps.barberController.getAllPublic);

  router.get(
    '/:id/slots',
    validate({ params: barberIdParamSchema, query: slotsQuerySchema }),
    deps.barberController.getSlots
  );

  router.use(deps.authenticate);

  router.put(
    '/me',
    authorize('Empleado', 'Admin'),
    validate({ body: updateBarberMeSchema }),
    deps.barberController.updateMe
  );

  router.get('/', deps.barberController.getAll);

  router.post(
    '/',
    authorize('Admin'),
    validate({ body: createBarberSchema }),
    deps.barberController.create
  );

  router.get(
    '/blocks',
    authorize('Admin', 'Empleado'),
    validate({ query: blockQuerySchema }),
    deps.barberController.getAllBlocks
  );

  router.get(
    '/:id',
    authorizeSelfOrKinds('id', 'Admin'),
    validate({ params: barberIdParamSchema }),
    deps.barberController.getById
  );

  router.put(
    '/:id',
    authorize('Admin'),
    validate({ params: barberIdParamSchema, body: updateBarberSchema }),
    deps.barberController.update
  );

  router.patch(
    '/:id/deactivate',
    authorize('Admin'),
    validate({ params: barberIdParamSchema }),
    deps.barberController.deactivate
  );

  router.delete(
    '/:id',
    authorize('Admin'),
    validate({ params: barberIdParamSchema }),
    deps.barberController.delete
  );

  router.get(
    '/:id/schedule',
    authorizeSelfOrKinds('id', 'Admin'),
    validate({ params: barberIdParamSchema }),
    deps.barberController.getSchedule
  );

  router.put(
    '/:id/schedule',
    authorize('Admin'),
    validate({ params: barberIdParamSchema, body: scheduleSchema }),
    deps.barberController.updateSchedule
  );

  router.get(
    '/:id/blocks',
    authorize('Admin', 'Empleado'),
    validate({ params: barberIdParamSchema, query: blockQuerySchema }),
    deps.barberController.getBlocks
  );

  router.post(
    '/:id/blocks',
    authorize('Admin', 'Empleado'),
    validate({ params: barberIdParamSchema, body: createBlockSchema }),
    deps.barberController.createBlock
  );

  router.delete(
    '/:id/blocks/:blockId',
    authorize('Admin', 'Empleado'),
    validate({ params: blockIdParamSchema }),
    deps.barberController.deleteBlock
  );

  return router;
};
