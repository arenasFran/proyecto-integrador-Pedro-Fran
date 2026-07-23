import Joi from 'joi';

export const createMembershipSchema = Joi.object({
  userId: Joi.string().required(),
  couponsTotal: Joi.number().integer().min(1).max(12).default(4),
  productDiscount: Joi.number().integer().min(0).max(100).default(10),
  durationDays: Joi.number().integer().min(1).max(365).default(30),
  billingCycle: Joi.string().valid('monthly', 'onetime').optional(),
  paymentMethod: Joi.string().valid('local').optional(),
  paymentId: Joi.string().optional(),
  price: Joi.number().min(0).optional(),
});

export const redeemCouponSchema = Joi.object({
  userId: Joi.string().required(),
});

export const queryMembershipsSchema = Joi.object({
  status: Joi.string().valid('active', 'expired', 'pending').optional(),
  search: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const initiateMembershipPaymentSchema = Joi.object({
  userId: Joi.string().required(),
});

export const createSubscriptionSchema = Joi.object({
  userId: Joi.string().required(),
  email: Joi.string().email().required(),
});

export const membershipIdParamSchema = Joi.object({
  id: Joi.string().hex().length(24).required().messages({
    'string.hex': 'ID inválido',
    'any.required': 'ID es requerido',
  }),
});

export const membershipUserIdParamSchema = Joi.object({
  userId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'userId debe ser un ObjectId válido',
    'any.required': 'userId es requerido',
  }),
});
