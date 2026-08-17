import express from 'express';
import rateLimit from 'express-rate-limit';
import { AppointmentController } from '../controllers/appointment/AppointmentController';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { getConfig } from '../../infrastructure/config/env';
import {
    anonymousQuerySchema,
    appointmentIdParamSchema,
    appointmentQuerySchema,
    cancelAppointmentSchema,
    changeBarberSchema,
    createAppointmentSchema,
    rescheduleAppointmentSchema,
    searchClientsQuerySchema,
    updateAppointmentStatusSchema,
} from '../validators/appointment.validator';

const anonymousLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiados intentos. Esperá 15 minutos.' },
});

const config = getConfig();
const createAppointmentLimiter = rateLimit({
  windowMs: config.rateLimit.appointmentCreate.windowMs,
  max: config.rateLimit.appointmentCreate.max,
  message: { error: 'Demasiadas solicitudes de creación de turnos. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const rescheduleMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes de reprogramación. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createAppointmentRouter = (deps: {
  appointmentController: AppointmentController;
  authenticate: express.RequestHandler;
  optionalAuth: express.RequestHandler;
}) => {
  const router = express.Router({ mergeParams: true });

  router.post(
    '/',
    createAppointmentLimiter,
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
    '/summary',
    deps.authenticate,
    validate({ query: appointmentQuerySchema }),
    deps.appointmentController.getSummary
  );

  router.get(
    '/clients/search',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ query: searchClientsQuerySchema }),
    deps.appointmentController.searchClients
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
    '/:id/reschedule',
    deps.authenticate,
    rescheduleMutationLimiter,
    validate({ params: appointmentIdParamSchema, body: rescheduleAppointmentSchema }),
    deps.appointmentController.reschedule
  );

  router.patch(
    '/:id/payment',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ params: appointmentIdParamSchema }),
    deps.appointmentController.markAsPaid
  );

  router.post(
    '/:id/send-reminder',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ params: appointmentIdParamSchema }),
    deps.appointmentController.sendReminderEmail
  );

  router.patch(
    '/:id/change-barber',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ params: appointmentIdParamSchema, body: changeBarberSchema }),
    deps.appointmentController.changeBarberHandler
  );

  return router;
};
