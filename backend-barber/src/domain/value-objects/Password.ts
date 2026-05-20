export class Password {
  private constructor(private readonly value: string) {}

  static create(raw: string): Password {
    if (!raw || raw.length < 6) {
      throw new Error('Password invalido');
    }
    return new Password(raw);
  }

  getValue(): string {
    return this.value;
  }
}
