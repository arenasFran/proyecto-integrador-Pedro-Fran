import { DurationMinutes } from '../../../src/domain/value-objects/DurationMinutes';

describe('DurationMinutes', () => {
  it('debe aceptar una duracion valida', () => {
    const duration = DurationMinutes.create(50);
    expect(duration.getValue()).toBe(50);
  });

  it('debe fallar con valores no positivos', () => {
    expect(() => DurationMinutes.create(-5)).toThrow('Duracion invalida');
  });
});
