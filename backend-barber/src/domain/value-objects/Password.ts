export class Password {
  private constructor(private readonly value: string) {}

  static create(raw: string): Password {
    if (!raw || raw.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(raw)) {
      throw new Error('La contraseña debe contener al menos una mayúscula');
    }
    if (!/[a-z]/.test(raw)) {
      throw new Error('La contraseña debe contener al menos una minúscula');
    }
    if (!/[0-9]/.test(raw)) {
      throw new Error('La contraseña debe contener al menos un número');
    }
    return new Password(raw);
  }

  getValue(): string {
    return this.value;
  }
}
