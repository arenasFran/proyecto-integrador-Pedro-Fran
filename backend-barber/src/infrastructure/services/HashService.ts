import crypto from 'crypto';
import { IHashService } from '../../application/ports/IHashService';
import { getConfig } from '../config/env';

export class HashService implements IHashService {
  sha256(input: string): string {
    const secret = getConfig().refreshHashSecret;
    return crypto.createHmac('sha256', secret).update(input).digest('hex');
  }
}
