import Joi from 'joi';

export const createOrderSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
});

export const orderIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const queryOrdersSchema = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'delivered', 'cancelled').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('paid', 'delivered', 'cancelled').required(),
});
