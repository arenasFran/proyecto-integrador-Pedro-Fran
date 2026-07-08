import Joi from 'joi';

export const createMembershipSchema = Joi.object({
  userId: Joi.string().required(),
  couponsTotal: Joi.number().integer().min(1).max(12).default(4),
  productDiscount: Joi.number().integer().min(0).max(100).default(10),
});

export const redeemCouponSchema = Joi.object({
  userId: Joi.string().required(),
});

export const queryMembershipsSchema = Joi.object({
  status: Joi.string().valid('active', 'expired', 'cancelled').optional(),
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
