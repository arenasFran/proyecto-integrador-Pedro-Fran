import express from 'express';
import rateLimit from 'express-rate-limit';
import { AppointmentController } from '../controllers/appointment/AppointmentController';
import { authorize, createAuthenticate, createOptionalAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  anonymousQuerySchema,
  appointmentIdParamSchema,
  appointmentQuerySchema,
  cancelAppointmentSchema,
  createAppointmentSchema,
  payAppointmentSchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
} from '../validators/appointment.validator';

const anonymousLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiados intentos. Esperá 15 minutos.' },
});

export const createAppointmentRouter = (deps: {
  appointmentController: AppointmentController;
  authenticate: express.RequestHandler;
  optionalAuth: express.RequestHandler;
}) => {
  const router = express.Router({ mergeParams: true });

  router.post(
    '/',
    deps.optionalAuth,
    validate({ body: createAppointmentSchema }),
    deps.appointmentController.create
  );

  router.get(
    '/anonymous',
    anonymousLimiter,
    validate({ query: anonymousQuerySchema }),
    deps.appointmentController.getAnonymous
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

  router.patch(
    '/:id/pay',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ params: appointmentIdParamSchema, body: payAppointmentSchema }),
    deps.appointmentController.pay
  );

  router.patch(
    '/:id/reschedule',
    deps.authenticate,
    validate({ params: appointmentIdParamSchema, body: rescheduleAppointmentSchema }),
    deps.appointmentController.reschedule
  );

  return router;
};
