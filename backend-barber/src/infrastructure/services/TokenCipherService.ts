import crypto from 'crypto';
import { getConfig } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Cifra/descifra valores que deben poder recuperarse en texto plano más adelante
 * (a diferencia de HashService, que es de un solo sentido). Único uso hoy: el
 * refresh token crudo que el bot de Telegram necesita re-presentar en /auth/refresh.
 */
export class TokenCipherService {
  private getKey(): Buffer {
    const secret = getConfig().telegram.tokenEncKey;
    if (!secret) {
      throw new Error('TELEGRAM_TOKEN_ENC_KEY no configurado.');
    }
    return crypto.createHash('sha256').update(secret).digest();
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.getKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(cipherText: string): string {
    const data = Buffer.from(cipherText, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.getKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }
}
