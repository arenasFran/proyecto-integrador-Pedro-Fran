import Joi from 'joi';

export const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(2).max(1000).required(),
  price: Joi.number().min(0).required(),
  stock: Joi.number().integer().min(0).required(),
  imageUrl: Joi.string().allow('').optional(),
  gallery: Joi.array().items(Joi.string().uri()).max(4).optional(),
  category: Joi.string().allow('').optional(),
});

export const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(2).max(1000).optional(),
  price: Joi.number().min(0).optional(),
  stock: Joi.number().integer().min(0).optional(),
  imageUrl: Joi.string().allow('').optional(),
  gallery: Joi.array().items(Joi.string().uri()).max(4).optional(),
  category: Joi.string().allow('').optional(),
  status: Joi.string().valid('active', 'inactive', 'deleted').optional(),
});

export const productIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const queryProductsSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'deleted').optional(),
  category: Joi.string().max(100).optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).max(10000).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const publicCatalogQuerySchema = Joi.object({
  category: Joi.string().max(100).optional(),
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).max(10000).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});
