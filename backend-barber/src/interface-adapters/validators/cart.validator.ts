import Joi from 'joi';

export const syncCartSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().trim().min(1).required(),
      quantity: Joi.number().integer().min(1).max(1000).required(),
    }).required()
  ).max(100).required(),
});
