export const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Ingresa un correo electrónico válido',
  },
  password: {
    minLength: 8,
    message: 'La contraseña debe tener al menos 8 caracteres',
    uppercase: /[A-Z]/,
    uppercaseMessage: 'Debe contener al menos una mayúscula',
    lowercase: /[a-z]/,
    lowercaseMessage: 'Debe contener al menos una minúscula',
    digit: /[0-9]/,
    digitMessage: 'Debe contener al menos un número',
  },
  name: {
    minLength: 3,
    message: 'El nombre debe tener al menos 3 caracteres',
  },
  lastname: {
    minLength: 3,
    message: 'El apellido debe tener al menos 3 caracteres',
  },
  phone: {
    pattern: /^[\d\s\-+()]{7,20}$/,
    message: 'Ingresa un número de teléfono válido',
  },
  token: {
    minLength: 6,
    message: 'El token debe tener al menos 6 caracteres',
  },
  code: {
    pattern: /^\d{6}$/,
    message: 'El código debe tener 6 dígitos',
  },
};

export const ERROR_MESSAGES = {
  passwordMismatch: 'Las contraseñas no coinciden',
  required: 'Este campo es requerido',
  email: 'Correo electrónico inválido',
  password: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número',
  name: 'El nombre debe tener al menos 3 caracteres',
  lastname: 'El apellido debe tener al menos 3 caracteres',
  phone: 'Número de teléfono inválido',
  token: 'Token inválido',
  code: 'Código inválido',
};