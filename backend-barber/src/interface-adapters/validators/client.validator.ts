import Joi from 'joi';

export const clientIdParamSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});

export const sancionarClienteSchema = Joi.object({
  motivo: Joi.string().trim().min(2).max(300).optional(),
});
