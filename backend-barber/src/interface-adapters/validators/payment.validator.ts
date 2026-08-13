import Joi from 'joi';

export const paymentIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required(),
});

export const paymentReferenceParamSchema = Joi.object({
  referenceId: Joi.string().trim().min(1).max(100).required(),
});

export const paymentPreferenceParamSchema = Joi.object({
  preferenceId: Joi.string().trim().min(1).max(200).required(),
});

export const paymentQuerySchema = Joi.object({
  type: Joi.string().valid('appointment', 'membership', 'product_order'),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled', 'refunded', 'charge_back', 'in_mediation'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const paymentReferenceQuerySchema = Joi.object({
  type: Joi.string().valid('appointment', 'membership', 'product_order'),
});
