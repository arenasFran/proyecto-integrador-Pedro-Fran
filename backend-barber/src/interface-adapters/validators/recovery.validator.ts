import Joi from 'joi';
import { EMAIL_REGEX } from '../../domain/constants/validation';

export const requestResetSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().min(6).required(),
  repeatPassword: Joi.any()
    .valid(Joi.ref('password'))
    .required()
    .messages({ 'any.only': 'Las contraseñas deben coincidir' }),
  email: Joi.string().email().required(),
});

export default { requestResetSchema, resetPasswordSchema };
