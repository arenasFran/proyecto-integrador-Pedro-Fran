import { AppError } from '../../application/errors/AppError';

export class Password {
  private constructor(private readonly value: string) {}

  static create(raw: string): Password {
    if (!raw || raw.length < 8) {
      throw new AppError('La contraseña debe tener al menos 8 caracteres', 400);
    }
    if (!/[A-Z]/.test(raw)) {
      throw new AppError('La contraseña debe contener al menos una mayúscula', 400);
    }
    if (!/[a-z]/.test(raw)) {
      throw new AppError('La contraseña debe contener al menos una minúscula', 400);
    }
    if (!/[0-9]/.test(raw)) {
      throw new AppError('La contraseña debe contener al menos un número', 400);
    }
    return new Password(raw);
  }

  getValue(): string {
    return this.value;
  }
}
