import crypto from 'crypto';
import { IHashService } from '../../application/ports/IHashService';

export class HashService implements IHashService {
  sha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}
