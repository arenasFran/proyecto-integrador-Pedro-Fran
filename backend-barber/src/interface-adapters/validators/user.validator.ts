import Joi from 'joi';

export const updateUserSchema = Joi.object({
  name: Joi.string().min(2).optional(),
  lastname: Joi.string().min(2).optional(),
  phone: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  photoUrl: Joi.string().uri().allow(null).optional(),
}).min(1);

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'La contraseña actual es obligatoria',
    'string.empty': 'La contraseña actual no puede estar vacía',
  }),
  newPassword: Joi.string().required().messages({
    'any.required': 'La nueva contraseña es obligatoria',
    'string.empty': 'La nueva contraseña no puede estar vacía',
  }),
  newPasswordConfirmation: Joi.string().required().messages({
    'any.required': 'La confirmación de contraseña es obligatoria',
    'string.empty': 'La confirmación de contraseña no puede estar vacía',
  }),
});
