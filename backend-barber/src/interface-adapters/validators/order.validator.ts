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
  paymentMethod: Joi.string().valid('online', 'local').optional(),
});

export const orderIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const queryOrdersSchema = Joi.object({
  status: Joi.string().valid('pending', 'paid', 'delivered', 'cancelled', 'refunded', 'disputed').optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
});

export const updateOrderStatusSchema = Joi.object({
  status: Joi.string().valid('paid', 'delivered', 'cancelled').required(),
});

export const createManualOrderSchema = Joi.object({
  items: createOrderSchema.extract('items'),
  userId: Joi.string().hex().length(24).optional(),
  clientName: Joi.string().trim().min(1).max(100).optional(),
  clientEmail: Joi.string().email().optional(),
  clientPhone: Joi.string().trim().max(20).optional(),
  status: Joi.string().valid('pending', 'paid', 'delivered').optional(),
});
