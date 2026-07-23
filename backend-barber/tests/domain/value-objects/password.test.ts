import { Password } from '../../../src/domain/value-objects/Password';

describe('Password', () => {
  it('debe aceptar una password valida', () => {
    const pass = Password.create('Abcd1234');
    expect(pass.getValue()).toBe('Abcd1234');
  });

  it('debe fallar si es muy corta', () => {
    expect(() => Password.create('Ab1')).toThrow('La contraseña debe tener al menos 8 caracteres');
  });

  it('debe fallar sin mayuscula', () => {
    expect(() => Password.create('abcd1234')).toThrow('La contraseña debe contener al menos una mayúscula');
  });

  it('debe fallar sin minuscula', () => {
    expect(() => Password.create('ABCD1234')).toThrow('La contraseña debe contener al menos una minúscula');
  });

  it('debe fallar sin numero', () => {
    expect(() => Password.create('Abcdefgh')).toThrow('La contraseña debe contener al menos un número');
  });
});
