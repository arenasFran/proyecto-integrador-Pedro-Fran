import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { ITokenService, TokenPayload } from '../../application/ports/ITokenService';

export type JwtTokenServiceConfig = {
  accessSecret: string;
  refreshSecret: string;
  partialSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  issuer: string;
  audience: string;
};

function toMs(value: string): StringValue {
  return value as StringValue;
}

export class JwtTokenService implements ITokenService {
  constructor(private readonly config: JwtTokenServiceConfig) {}

  sign(payload: TokenPayload): string {
    return this.signAccessToken(payload);
  }

  verify(token: string): TokenPayload {
    return this.verifyAccessToken(token);
  }

  signAccessToken(payload: TokenPayload): string {
    return jwt.sign(
      {
        ...payload,
        type: 'access',
        iss: this.config.issuer,
        aud: this.config.audience,
        iat: Math.floor(Date.now() / 1000),
      },
      this.config.accessSecret,
      {
        expiresIn: toMs(this.config.accessTokenExpiresIn),
        algorithm: 'HS256',
      }
    );
  }

  signRefreshToken(payload: TokenPayload): string {
    return jwt.sign(
      {
        ...payload,
        type: 'refresh',
        iss: this.config.issuer,
        aud: this.config.audience,
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomBytes(16).toString('hex'),
      },
      this.config.refreshSecret,
      {
        expiresIn: toMs(this.config.refreshTokenExpiresIn),
        algorithm: 'HS256',
      }
    );
  }

  verifyAccessToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.config.accessSecret, {
      algorithms: ['HS256'],
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Token inválido');
    }
    const payload = decoded as TokenPayload & { type?: string };
    if (payload.type && payload.type !== 'access') {
      throw new Error('Tipo de token inválido');
    }
    const { id, email, kind } = payload;
    if (!id || !email || !kind) {
      throw new Error('Token inválido');
    }
    return { id, email, kind };
  }

  verifyRefreshToken(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.config.refreshSecret, {
      algorithms: ['HS256'],
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Token inválido');
    }
    const payload = decoded as TokenPayload & { type?: string };
    if (payload.type !== 'refresh') {
      throw new Error('Tipo de token inválido');
    }
    const { id, email, kind } = payload;
    if (!id || !email || !kind) {
      throw new Error('Token inválido');
    }
    return { id, email, kind };
  }

  signPartialToken(email: string, googleId?: string): string {
    return jwt.sign(
      { email, googleId, type: 'partial' },
      this.config.partialSecret,
      { expiresIn: '5m', algorithm: 'HS256' }
    );
  }

  verifyPartialToken(token: string): { email: string; googleId?: string } {
    const decoded = jwt.verify(token, this.config.partialSecret, {
      algorithms: ['HS256'],
    }) as { email?: string; googleId?: string; type?: string };
    if (!decoded || typeof decoded === 'string' || !decoded.email || decoded.type !== 'partial') {
      throw new Error('Token parcial inválido');
    }
    return { email: decoded.email, googleId: decoded.googleId };
  }
}
