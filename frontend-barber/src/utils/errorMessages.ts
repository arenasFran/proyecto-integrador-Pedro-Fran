const ERROR_CODE_MAP: Record<string, string> = {
  'ACCOUNT_EXISTS_LOCAL': 'Este email ya está registrado con una contraseña. Usá el formulario de inicio de sesión.',
};

export function mapErrorCode(message: string): string | null {
  return ERROR_CODE_MAP[message] ?? null;
}

export function getErrorMessage(error: unknown, fallback = 'Error inesperado'): string {
  if (!error) return fallback;

  if (error instanceof Error) {
    return mapErrorCode(error.message) ?? error.message;
  }

  if (typeof error === 'object' && error !== null) {
    if ('data' in error) {
      const msg = String((error as { data: unknown }).data);
      return mapErrorCode(msg) ?? msg;
    }
    if ('message' in error) {
      return String((error as { message: unknown }).message);
    }
  }

  if (typeof error === 'string') {
    return mapErrorCode(error) ?? error;
  }

  return fallback;
}
