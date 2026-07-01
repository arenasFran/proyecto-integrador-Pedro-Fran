import Joi from 'joi';

export const createServiceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().min(1).max(500).required(),
  price: Joi.number().precision(2).min(0.01).required(),
  imageUrl: Joi.string().uri().allow('', null).optional(),
});

export const updateServiceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().min(1).max(500).optional(),
  price: Joi.number().precision(2).min(0.01).optional(),
  imageUrl: Joi.string().uri().allow('', null).optional(),
  status: Joi.string().valid('active', 'inactive', 'deleted').optional(),
}).min(1);

export const serviceIdParamSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});
