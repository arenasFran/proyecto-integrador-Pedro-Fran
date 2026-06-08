import express from 'express';
import { BarberController } from '../controllers/barber/BarberController';
import { authorize, authorizeSelfOrKinds } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  barberIdParamSchema,
  createBarberSchema,
  scheduleSchema,
  slotsQuerySchema,
  updateBarberSchema,
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

  router.get('/', deps.barberController.getAll);

  router.post(
    '/',
    authorize('Admin'),
    validate({ body: createBarberSchema }),
    deps.barberController.create
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

  return router;
};
