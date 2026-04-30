export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const ROLES = {
  ADMIN: 'admin',
  BARBER: 'barber',
  CLIENT: 'client',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  UNAUTHORIZED: 'Sesión expirada. Inicia sesión novamente.',
  SERVER_ERROR: 'Error del servidor. Intenta más tarde.',
} as const;