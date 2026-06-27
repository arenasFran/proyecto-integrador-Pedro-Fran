import Joi from 'joi';

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  lastname: Joi.string().min(2).optional(),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  photoUrl: Joi.string().uri().allow(null).optional(),
}).min(1);
