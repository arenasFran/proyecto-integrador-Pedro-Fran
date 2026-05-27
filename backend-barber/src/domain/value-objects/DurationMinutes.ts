export class DurationMinutes {
  private constructor(private readonly value: number) {}

  static create(raw: number): DurationMinutes {
    if (!Number.isFinite(raw) || raw <= 0) {
      throw new Error('Duracion invalida');
    }
    return new DurationMinutes(raw);
  }

  getValue(): number {
    return this.value;
  }
}
