import Joi from 'joi';
import { EMAIL_REGEX } from '../../domain/constants/validation';

export const requestResetSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required(),
});

const codeSchema = Joi.string()
  .pattern(/^\d{6}$/)
  .required()
  .messages({
    'string.pattern.base': 'El código debe tener 6 dígitos',
    'any.required': 'El código es requerido',
  });

export const verifyResetCodeSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required(),
  code: codeSchema,
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required(),
  code: codeSchema,
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'mayúscula')
    .pattern(/[a-z]/, 'minúscula')
    .pattern(/[0-9]/, 'número')
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'string.pattern.name': 'La contraseña debe contener al menos una {#name}',
    }),
  repeatPassword: Joi.any()
    .valid(Joi.ref('password'))
    .required()
    .messages({ 'any.only': 'Las contraseñas deben coincidir' }),
});

export default { requestResetSchema, verifyResetCodeSchema, resetPasswordSchema };
