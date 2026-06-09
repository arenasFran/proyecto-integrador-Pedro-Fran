import crypto from 'crypto';
import { IRandomGenerator } from '../../application/ports/IRandomGenerator';

export class RandomGenerator implements IRandomGenerator {
  constructor(private readonly testCodeOverride?: string) {}

  generateNumericCode(length: number): string {
    const min = 10 ** (length - 1);
    const max = 10 ** length - 1;
    return crypto.randomInt(min, max).toString();
  }

  generateHexToken(bytes: number): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
