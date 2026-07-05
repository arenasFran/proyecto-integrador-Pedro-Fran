import Joi from 'joi';

export const createMembershipSchema = Joi.object({
  userId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'userId debe ser un ObjectId válido',
    'any.required': 'userId es requerido',
  }),
  couponsTotal: Joi.number().integer().min(1).max(12).optional(),
  productDiscount: Joi.number().integer().min(0).max(100).optional(),
});

export const redeemCouponSchema = Joi.object({
  userId: Joi.string().hex().length(24).required().messages({
    'string.hex': 'userId debe ser un ObjectId válido',
    'any.required': 'userId es requerido',
  }),
});

export const queryMembershipsSchema = Joi.object({
  status: Joi.string().valid('active', 'expired', 'cancelled').optional(),
  search: Joi.string().optional(),
});
