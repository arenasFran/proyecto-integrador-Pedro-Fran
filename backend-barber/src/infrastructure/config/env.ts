import dotenv from 'dotenv';

export type Config = {
  port: number;
  corsOrigin: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtPartialSecret: string;
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
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  mpAccessToken: string | undefined;
  mpWebhookSecret: string | undefined;
  mpNotificationUrl: string | undefined;
  membershipPriceUyu: number;
  rateLimit: {
    login: { max: number; windowMs: number };
    register: { max: number; windowMs: number };
    reset: { max: number; windowMs: number };
    twoFA: { max: number; windowMs: number };
    google: { max: number; windowMs: number };
  };
};

const requiredVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'JWT_PARTIAL_SECRET', 'MONGO_URI', 'REFRESH_HASH_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const;
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

  const jwtAccessSecret = requireEnv('JWT_ACCESS_SECRET');
  const jwtRefreshSecret = requireEnv('JWT_REFRESH_SECRET');
  const jwtPartialSecret = requireEnv('JWT_PARTIAL_SECRET');

  return {
    port: parseIntEnv('PORT', 3000),
    corsOrigin: optionalEnv('CORS_ORIGIN', 'http://localhost:5173'),
    jwtAccessSecret,
    jwtRefreshSecret,
    jwtPartialSecret,
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
    cloudinaryCloudName: requireEnv('CLOUDINARY_CLOUD_NAME'),
    cloudinaryApiKey: requireEnv('CLOUDINARY_API_KEY'),
    cloudinaryApiSecret: requireEnv('CLOUDINARY_API_SECRET'),
    mpAccessToken: process.env.MP_ACCESS_TOKEN || undefined,
    mpWebhookSecret: process.env.MP_WEBHOOK_SECRET || undefined,
    mpNotificationUrl: process.env.MP_NOTIFICATION_URL || undefined,
    membershipPriceUyu: parseIntEnv('MEMBERSHIP_PRICE_UYU', 399),
    rateLimit: {
      login: { max: parseIntEnv('RATE_LIMIT_LOGIN_MAX', 50), windowMs: 15 * 60 * 1000 },
      register: { max: parseIntEnv('RATE_LIMIT_REGISTER_MAX', 50), windowMs: 15 * 60 * 1000 },
      reset: { max: parseIntEnv('RATE_LIMIT_RESET_MAX', 20), windowMs: 15 * 60 * 1000 },
      twoFA: { max: parseIntEnv('RATE_LIMIT_2FA_MAX', 30), windowMs: 15 * 60 * 1000 },
      google: { max: parseIntEnv('RATE_LIMIT_GOOGLE_MAX', 20), windowMs: 15 * 60 * 1000 },
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

    if (config.mpAccessToken) {
      const isTestToken = config.mpAccessToken.startsWith('TEST-');
      const isProdToken = config.mpAccessToken.startsWith('APP_USR-');
      if (isProdToken && config.mpNotificationUrl && config.mpNotificationUrl.includes('localhost')) {
        console.warn('[MP-CREDENTIALS] ATENCION: Usando token PRODUCTIVO (APP_USR-) con notification_url local. Los webhooks no funcionaran en produccion.');
      }
      if (isTestToken) {
        console.log('[MP-CREDENTIALS] Usando credenciales de TEST (sandbox). OK para desarrollo.');
      } else if (isProdToken) {
        console.log('[MP-CREDENTIALS] Usando credenciales PRODUCTIVAS (APP_USR-).');
      } else {
        console.warn('[MP-CREDENTIALS] El token no tiene prefijo TEST- ni APP_USR-. Verifica que sea valido.');
      }
    } else {
      console.warn('[MP-CREDENTIALS] MP_ACCESS_TOKEN no configurado. MercadoPago no estara disponible.');
    }

    if (config.mpWebhookSecret) {
      console.log('[MP-CREDENTIALS] MP_WEBHOOK_SECRET configurado. HMAC habilitado.');
    } else {
      console.warn('[MP-CREDENTIALS] MP_WEBHOOK_SECRET no configurado. La validacion HMAC del webhook fallara siempre.');
    }

    if (config.mpNotificationUrl) {
      const isLocal = /localhost|127\.0\.0\.1|192\.168\./.test(config.mpNotificationUrl);
      if (isLocal) {
        console.warn('[MP-CREDENTIALS] MP_NOTIFICATION_URL apunta a ' + config.mpNotificationUrl + ' (local). Para recibir webhooks de MP usa ngrok o similar.');
      } else {
        console.log('[MP-CREDENTIALS] MP_NOTIFICATION_URL: ' + config.mpNotificationUrl);
      }
    }

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
