import Joi from 'joi';
import { EMAIL_REGEX } from '../../domain/constants/validation';

export const registerSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required(),
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
    .messages({
      'any.only': 'Las contraseñas deben coincidir',
      'any.required': 'La confirmación de contraseña es obligatoria',
    }),
  name: Joi.string().min(3).required(),
  lastname: Joi.string().min(3).required(),
  phone: Joi.string().required(),
  termsVersion: Joi.string().required().messages({
    'any.required': 'Debés aceptar los Términos y Condiciones',
  }),
  privacyVersion: Joi.string().required().messages({
    'any.required': 'Debés aceptar la Política de Privacidad',
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required().messages({
    'string.pattern.base': 'El email no tiene un formato válido',
    'any.required': 'El email es obligatorio',
  }),
  password: Joi.string().required().messages({
    'any.required': 'La contraseña es obligatoria',
  }),
});

export const googleLoginSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'El token de Google es obligatorio',
    'string.base': 'El token debe ser un string',
  }),
});

export const twoFactorSendSchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required(),
  password: Joi.string().required(),
});

export const twoFactorVerifySchema = Joi.object({
  email: Joi.string().pattern(EMAIL_REGEX).required(),
  code: Joi.string().length(6).required(),
});

export const completeGoogleProfileSchema = Joi.object({
  partialToken: Joi.string().required().messages({
    'any.required': 'El token parcial es obligatorio',
  }),
  name: Joi.string().min(1).required().messages({
    'any.required': 'El nombre es obligatorio',
    'string.min': 'El nombre no puede estar vacío',
  }),
  lastname: Joi.string().allow('').optional(),
  phone: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'refreshToken es obligatorio',
  }),
});
