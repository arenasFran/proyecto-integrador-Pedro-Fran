import Joi from 'joi';
import { EMAIL_REGEX, TIME_REGEX } from '../../domain/constants/validation';

export const createAppointmentSchema = Joi.object({
  barberId: Joi.string().required(),
  serviceId: Joi.string().required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  startTime: Joi.string()
    .pattern(TIME_REGEX)
    .messages({ 'string.pattern.base': 'startTime debe tener formato HH:mm (ej. 09:30)' })
    .required(),
  clientName: Joi.string().trim().min(1).max(100).required(),
  clientLastname: Joi.string().trim().min(1).max(100).required(),
  clientPhone: Joi.string().trim().max(20).allow('', null),
  clientEmail: Joi.string().pattern(EMAIL_REGEX).trim().required(),
  tempLockId: Joi.string().optional(),
});

export const appointmentQuerySchema = Joi.object({
  barberId: Joi.string(),
  clientId: Joi.string(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
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
  email: Joi.string().pattern(EMAIL_REGEX).trim(),
  phone: Joi.string().trim().max(20),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
}).min(1);

export const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Cancelado', 'Completado', 'NoShow')
    .required(),
  cancelReason: Joi.string().trim().min(1).max(500).when('status', {
    is: 'Cancelado',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
});

