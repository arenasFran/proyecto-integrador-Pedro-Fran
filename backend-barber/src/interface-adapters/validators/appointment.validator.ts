import Joi from 'joi';
import { EMAIL_REGEX, TIME_REGEX } from '../../domain/constants/validation';

export const createAppointmentSchema = Joi.object({
  barberId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  serviceId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  startTime: Joi.string()
    .pattern(TIME_REGEX)
    .messages({ 'string.pattern.base': 'startTime debe tener formato HH:mm (ej. 09:30)' })
    .required(),
  clientId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  clientName: Joi.string().trim().min(1).max(100).required(),
  clientLastname: Joi.string().trim().min(1).max(100).required(),
  clientPhone: Joi.string().trim().min(7).max(20).required(),
  clientEmail: Joi.string().pattern(EMAIL_REGEX).trim().required(),
  paymentMethod: Joi.string().valid('local', 'online', 'memberPass').optional(),
  tempLockId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});

export const appointmentQuerySchema = Joi.object({
  barberId: Joi.string(),
  clientId: Joi.string(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  status: Joi.string().valid('Confirmado', 'Cancelado', 'Completado', 'NoShow'),
  paymentMethod: Joi.string().valid('local', 'online', 'memberPass'),
  paymentStatus: Joi.string().valid('Pendiente', 'Pagado', 'Cancelado'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  includeBarber: Joi.string().valid('true'),
  includeClient: Joi.string().valid('true'),
  sortBy: Joi.string().valid('date', 'startTime'),
  sortDir: Joi.string().valid('asc', 'desc'),
});

export const appointmentIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const cancelAppointmentSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});

export const rescheduleAppointmentSchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  startTime: Joi.string()
    .pattern(TIME_REGEX)
    .messages({ 'string.pattern.base': 'startTime debe tener formato HH:mm (ej. 09:30)' })
    .required(),
  barberId: Joi.string().required(),
});

export const anonymousQuerySchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).trim().required(),
  phone: Joi.string().trim().max(20).required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
});

export const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Cancelado', 'Completado', 'NoShow')
    .required(),
  cancelReason: Joi.string().trim().min(1).max(500).when('status', {
    is: 'Cancelado',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  paymentStatus: Joi.string().valid('Pagado').optional(),
});

export const changeBarberSchema = Joi.object({
  barberId: Joi.string().required(),
});

export const searchClientsQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(100).required(),
});

