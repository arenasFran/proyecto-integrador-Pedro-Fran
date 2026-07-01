import { AppError } from '../errors/AppError';

export class Phone {
  private constructor(private readonly value: string) {}

  static create(raw: string): Phone {
    const normalized = Phone.normalize(raw);
    if (!/^\+?\d{7,15}$/.test(normalized)) {
      throw new AppError('Teléfono inválido', 400);
    }
    return new Phone(normalized);
  }

  static normalize(raw: string): string {
    let cleaned = raw.trim().replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('00')) {
      cleaned = '+' + cleaned.slice(2);
    } else if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
      cleaned = '+598' + cleaned.slice(1);
    }
    return cleaned;
  }

  getValue(): string {
    return this.value;
  }
}

