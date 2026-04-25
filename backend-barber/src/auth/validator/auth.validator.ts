import Joi from 'joi';

export const registerSchema = Joi.object({
    email: Joi.string()
    .email()
    .required(),
    password: Joi.string()
    .min(6)
    .required(),
    repeatPassword: Joi.any()
    .valid(Joi.ref('password'))
    .required()
    .messages({
        'any.only': 'Las contraseñas deben coincidir',
        'any.required': 'La confirmación de contraseña es obligatoria'
    }),
    name: Joi.
    string()
    .min(3)
    .required(),
    lastname: Joi.string()
    .min(3)
    .required(),
    phone: Joi.string()
    .required()
})

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'El email no tiene un formato válido',
    'any.required': 'El email es obligatorio'
  }),
  password: Joi.string().required().messages({
    'any.required': 'La contraseña es obligatoria'
  })
})