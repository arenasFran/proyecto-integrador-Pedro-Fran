import dotenv from 'dotenv';

export type Config = {
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  jwtIssuer: string;
  jwtAudience: string;
  mongoUri: string;
  frontendUrl: string;
  resetTokenExpirationMin: number;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string | undefined;
    pass: string | undefined;
    from: string;
  };
  googleClientId: string | undefined;
  refreshHashSecret: string;
  rateLimit: {
    login: { max: number; windowMs: number };
    register: { max: number; windowMs: number };
    reset: { max: number; windowMs: number };
    twoFA: { max: number; windowMs: number };
    google: { max: number; windowMs: number };
  };
};

const requiredVars = ['JWT_SECRET', 'MONGO_URI', 'REFRESH_HASH_SECRET'] as const;
const requiredIfEmail = ['SMTP_HOST', 'SMTP_PORT'] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

function parseIntEnv(name: string, defaultValue: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return defaultValue;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.warn(`Variable ${name} inválida ("${raw}"), usando default: ${defaultValue}`);
    return defaultValue;
  }
  return parsed;
}

function parseBoolEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return raw === 'true' || raw === '1';
}

export function loadConfig(): Config {
  dotenv.config();

  const jwtSecret = requireEnv('JWT_SECRET');

  return {
    port: parseIntEnv('PORT', 3000),
    corsOrigin: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),
    jwtSecret,
    jwtExpiresIn: optionalEnv('JWT_EXPIRES_IN', '15m'),
    jwtRefreshExpiresIn: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
    jwtIssuer: optionalEnv('JWT_ISSUER', 'barberia-api'),
    jwtAudience: optionalEnv('JWT_AUDIENCE', 'barberia-client'),
    mongoUri: requireEnv('MONGO_URI'),
    frontendUrl: optionalEnv('FRONTEND_URL', ''),
    resetTokenExpirationMin: parseIntEnv('RESET_TOKEN_EXPIRATION_MIN', 60),
    smtp: {
      host: optionalEnv('SMTP_HOST', 'localhost'),
      port: parseIntEnv('SMTP_PORT', 587),
      secure: parseBoolEnv('SMTP_SECURE', false),
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || undefined,
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com',
    },
    googleClientId: process.env.GOOGLE_CLIENT_ID || undefined,
    refreshHashSecret: requireEnv('REFRESH_HASH_SECRET'),
    rateLimit: {
      login: { max: parseIntEnv('RATE_LIMIT_LOGIN_MAX', 5), windowMs: 15 * 60 * 1000 },
      register: { max: parseIntEnv('RATE_LIMIT_REGISTER_MAX', 10), windowMs: 15 * 60 * 1000 },
      reset: { max: parseIntEnv('RATE_LIMIT_RESET_MAX', 3), windowMs: 15 * 60 * 1000 },
      twoFA: { max: parseIntEnv('RATE_LIMIT_2FA_MAX', 5), windowMs: 15 * 60 * 1000 },
      google: { max: parseIntEnv('RATE_LIMIT_GOOGLE_MAX', 5), windowMs: 15 * 60 * 1000 },
    },
  };
}

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export function validateEnv(): Config {
  try {
    const config = loadConfig();
    console.log('Variables de entorno validadas correctamente.');
    return config;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error('Error desconocido validando variables de entorno.');
    }
    process.exit(1);
  }
}
