import Joi from 'joi'

export const createBarberSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'El nombre es obligatorio'
  }),
  lastname: Joi.string().required().messages({
    'any.required': 'El apellido es obligatorio'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'El email no es válido',
    'any.required': 'El email es obligatorio'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'La contraseña debe tener al menos 8 caracteres',
    'any.required': 'La contraseña es obligatoria'
  }),
  phone: Joi.string().required().messages({
    'any.required': 'El teléfono es obligatorio'
  }),
  kind: Joi.string().valid('Empleado', 'Admin').required().messages({
    'any.only': 'El tipo debe ser Empleado o Admin',
    'any.required': 'El tipo es obligatorio'
  })
})