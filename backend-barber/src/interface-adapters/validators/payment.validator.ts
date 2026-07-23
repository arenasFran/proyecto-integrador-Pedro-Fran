import Joi from 'joi';

export const paymentIdParamSchema = Joi.object({
  id: Joi.string().required(),
});
