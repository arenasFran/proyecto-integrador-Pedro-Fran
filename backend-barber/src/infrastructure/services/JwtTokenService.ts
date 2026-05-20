import jwt, { SignOptions } from 'jsonwebtoken';
import { ITokenService, TokenPayload } from '../../application/ports/ITokenService';

export class JwtTokenService implements ITokenService {
  private readonly expiresIn: SignOptions['expiresIn'];

  constructor(expiresIn?: SignOptions['expiresIn']) {
    this.expiresIn = expiresIn || (process.env.JWT_EXPIRES_IN || '1h');
  }

  sign(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: this.expiresIn,
      algorithm: 'HS256',
    });
  }

  verify(token: string): TokenPayload {
    const secret = process.env.JWT_SECRET as string;
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Token inválido');
    }
    const { id, email, kind } = decoded as TokenPayload;
    if (!id || !email || !kind) {
      throw new Error('Token inválido');
    }
    return { id, email, kind };
  }
}
