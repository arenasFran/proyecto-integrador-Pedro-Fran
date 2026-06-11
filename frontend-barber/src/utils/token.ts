export type TokenUser = {
  id: string;
  email: string;
  kind: 'Admin' | 'Empleado' | 'Registrado';
};

type JwtPayload = TokenUser & {
  exp?: number;
};

const base64UrlToBase64 = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = padded.length % 4;

  if (remainder === 0) {
    return padded;
  }

  return `${padded}${'='.repeat(4 - remainder)}`;
};

export const decodeTokenPayload = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payloadJson = atob(base64UrlToBase64(parts[1]));
    const payload = JSON.parse(payloadJson) as JwtPayload;

    return payload;
  } catch {
    return null;
  }
};

export const getTokenKind = (token?: string | null): TokenUser['kind'] | null => {
  if (!token) {
    return null;
  }

  const payload = decodeTokenPayload(token);
  return payload?.kind ?? null;
};

export const getTokenUser = (token?: string | null): TokenUser | null => {
  if (!token) {
    return null;
  }

  const payload = decodeTokenPayload(token);
  if (!payload || !payload.id) {
    return null;
  }

  return { id: payload.id, email: payload.email, kind: payload.kind as TokenUser['kind'] };
};

export const isTokenValid = (token?: string | null): boolean => {
  if (!token) {
    return false;
  }

  const payload = decodeTokenPayload(token);
  if (!payload) {
    return false;
  }

  if (typeof payload.exp !== 'number') {
    return true;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return payload.exp > nowSeconds;
};
