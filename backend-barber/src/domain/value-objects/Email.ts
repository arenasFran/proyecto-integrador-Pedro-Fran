import { EMAIL_REGEX } from '../constants/validation';

export class Email {
  private constructor(private readonly value: string) {}

  static create(raw: string): Email {
    const normalized = raw.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error('Email invalido');
    }
    return new Email(normalized);
  }

  getValue(): string {
    return this.value;
  }
}
