export class Price {
  private constructor(private readonly value: number) {}

  static create(raw: number): Price {
    if (!Number.isFinite(raw) || raw <= 0) {
      throw new Error('Precio invalido');
    }
    return new Price(raw);
  }

  getValue(): number {
    return this.value;
  }
}
