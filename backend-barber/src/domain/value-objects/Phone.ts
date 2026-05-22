export class Phone {
  private constructor(private readonly value: string) {}

  static create(raw: string): Phone {
    const normalized = raw.trim();
    if (!normalized) {
      throw new Error('Telefono invalido');
    }
    return new Phone(normalized);
  }

  getValue(): string {
    return this.value;
  }
}
