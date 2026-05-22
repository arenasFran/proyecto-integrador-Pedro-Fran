import { Password } from '../../../src/domain/value-objects/Password';

describe('Password', () => {
  it('debe aceptar una password valida', () => {
    const pass = Password.create('123456');
    expect(pass.getValue()).toBe('123456');
  });

  it('debe fallar si es muy corta', () => {
    expect(() => Password.create('123')).toThrow('Password invalido');
  });
});
