import Joi from 'joi';
import { EMAIL_REGEX, TIME_REGEX } from '../../domain/constants/validation';

const timeSchema = Joi.string().pattern(TIME_REGEX);

const breakSchema = Joi.object({
  startTime: timeSchema.required(),
  endTime: timeSchema.required(),
}).custom((value, helpers) => {
  if (value.startTime >= value.endTime) {
    return helpers.message({ 'any.custom': 'El inicio del break debe ser anterior al fin' });
  }
  return value;
});

const scheduleDaySchema = Joi.object({
  startTime: timeSchema.allow(null),
  endTime: timeSchema.allow(null),
  breaks: Joi.array().items(breakSchema).default([]),
}).custom((value, helpers) => {
  const hasStart = Boolean(value.startTime);
  const hasEnd = Boolean(value.endTime);

  if (hasStart !== hasEnd) {
    return helpers.message({
      'any.custom': 'startTime y endTime deben estar ambos definidos o ambos null',
    });
  }

  if (hasStart && value.startTime >= value.endTime) {
    return helpers.message({ 'any.custom': 'startTime debe ser menor que endTime' });
  }

  return value;
});

export const scheduleSchema = Joi.object({
  monday: scheduleDaySchema.required(),
  tuesday: scheduleDaySchema.required(),
  wednesday: scheduleDaySchema.required(),
  thursday: scheduleDaySchema.required(),
  friday: scheduleDaySchema.required(),
  saturday: scheduleDaySchema.required(),
  sunday: scheduleDaySchema.required(),
});

export const createBarberSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().min(3).required(),
  lastname: Joi.string().min(3).required(),
  phone: Joi.string().required(),
  services: Joi.array().items(Joi.string().min(1)).default([]),
  age: Joi.number().integer().min(0).optional(),
  photoUrl: Joi.string().uri().allow(null).optional(),
  slotDuration: Joi.number().integer().min(1).default(30),
  maxAdvanceDays: Joi.number().integer().min(1).default(30),
  schedule: scheduleSchema.required(),
});

export const updateBarberSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).optional(),
  password: Joi.string().min(6).optional(),
  name: Joi.string().min(3).optional(),
  lastname: Joi.string().min(3).optional(),
  phone: Joi.string().optional(),
  services: Joi.array().items(Joi.string().min(1)).optional(),
  age: Joi.number().integer().min(0).allow(null).optional(),
  photoUrl: Joi.string().uri().allow(null).optional(),
  isActive: Joi.boolean().optional(),
  slotDuration: Joi.number().integer().min(1).optional(),
  maxAdvanceDays: Joi.number().integer().min(1).optional(),
}).min(1);

export const barberIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const slotsQuerySchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});

export const createBlockSchema = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  startTime: Joi.string().pattern(TIME_REGEX).required(),
  endTime: Joi.string().pattern(TIME_REGEX).required(),
}).custom((value, helpers) => {
  if (value.startTime >= value.endTime) {
    return helpers.message({ 'any.custom': 'startTime debe ser anterior a endTime' });
  }
  return value;
});

export const blockIdParamSchema = Joi.object({
  id: Joi.string().required(),
  blockId: Joi.string().required(),
});

export const blockQuerySchema = Joi.object({
  dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
});

export const updateBarberMeSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).optional(),
  password: Joi.string().min(6).optional(),
  name: Joi.string().min(3).optional(),
  lastname: Joi.string().min(3).optional(),
  phone: Joi.string().optional(),
  services: Joi.array().items(Joi.string().min(1)).optional(),
  age: Joi.number().integer().min(0).allow(null).optional(),
  photoUrl: Joi.string().uri().allow(null).optional(),
  slotDuration: Joi.number().integer().min(1).optional(),
  maxAdvanceDays: Joi.number().integer().min(1).optional(),
  schedule: scheduleSchema.optional(),
}).min(1);
