import express from 'express';
import { AppointmentController } from '../controllers/appointment/AppointmentController';
import { authorize, createAuthenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  appointmentIdParamSchema,
  appointmentQuerySchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../validators/appointment.validator';

export const createAppointmentRouter = (deps: {
  appointmentController: AppointmentController;
  authenticate: express.RequestHandler;
}) => {
  const router = express.Router({ mergeParams: true });

  router.post(
    '/',
    validate({ body: createAppointmentSchema }),
    deps.appointmentController.create
  );

  router.get(
    '/',
    deps.authenticate,
    validate({ query: appointmentQuerySchema }),
    deps.appointmentController.getAll
  );

  router.get(
    '/:id',
    deps.authenticate,
    validate({ params: appointmentIdParamSchema }),
    deps.appointmentController.getById
  );

  router.patch(
    '/:id/cancel',
    deps.authenticate,
    validate({ params: appointmentIdParamSchema, body: cancelAppointmentSchema }),
    deps.appointmentController.cancel
  );

  router.patch(
    '/:id/status',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ params: appointmentIdParamSchema, body: updateAppointmentStatusSchema }),
    deps.appointmentController.updateStatus
  );

  return router;
};
