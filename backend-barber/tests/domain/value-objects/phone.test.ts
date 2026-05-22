import { Phone } from '../../../src/domain/value-objects/Phone';

describe('Phone', () => {
  it('debe normalizar y validar phone', () => {
    const phone = Phone.create(' 123456789 ');
    expect(phone.getValue()).toBe('123456789');
  });

  it('debe fallar si esta vacio', () => {
    expect(() => Phone.create(' ')).toThrow('Telefono invalido');
  });
});
