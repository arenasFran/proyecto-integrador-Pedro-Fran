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
    lastName: Joi.string()
    .min(3)
    .required(),
    phone: Joi.string()
    .pattern(/^(\+598|0)?9[1-9]\d{7}$/)
    .required()
})