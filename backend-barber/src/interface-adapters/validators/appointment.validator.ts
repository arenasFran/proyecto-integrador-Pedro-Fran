import Joi from 'joi';

export const createAppointmentSchema = Joi.object({
  barberId: Joi.string().required(),
  serviceId: Joi.string().required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  startTime: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .required(),
  clientName: Joi.string().trim().min(1).max(100).required(),
  clientLastname: Joi.string().trim().min(1).max(100).required(),
  clientPhone: Joi.string().trim().max(20).allow('', null),
  clientEmail: Joi.string().email().trim().allow('', null),
});

export const appointmentQuerySchema = Joi.object({
  barberId: Joi.string(),
  clientId: Joi.string(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
});

export const appointmentIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const cancelAppointmentSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});

export const updateAppointmentStatusSchema = Joi.object({
  status: Joi.string()
    .valid('Pendiente', 'Confirmado', 'Cancelado', 'Completado')
    .required(),
  cancelReason: Joi.string().trim().max(500).when('status', {
    is: 'Cancelado',
    then: Joi.allow('', null),
    otherwise: Joi.forbidden(),
  }),
});
