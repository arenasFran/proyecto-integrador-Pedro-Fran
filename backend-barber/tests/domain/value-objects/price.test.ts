import { Price } from '../../../src/domain/value-objects/Price';

describe('Price', () => {
  it('debe aceptar un precio valido', () => {
    const price = Price.create(490);
    expect(price.getValue()).toBe(490);
  });

  it('debe fallar con valores no positivos', () => {
    expect(() => Price.create(0)).toThrow('Precio invalido');
  });
});
