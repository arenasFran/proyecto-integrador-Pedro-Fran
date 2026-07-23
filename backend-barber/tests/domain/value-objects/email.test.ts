import { Email } from '../../../src/domain/value-objects/Email';

describe('Email', () => {
  it('debe normalizar y validar el email', () => {
    const email = Email.create('  TEST@Example.com ');
    expect(email.getValue()).toBe('test@example.com');
  });

  it('debe aceptar email con subdominio y +tag', () => {
    const email = Email.create('user.name+tag@sub.dominio.com.uy');
    expect(email.getValue()).toBe('user.name+tag@sub.dominio.com.uy');
  });

  it('debe aceptar email basico', () => {
    const email = Email.create('user@dominio.com');
    expect(email.getValue()).toBe('user@dominio.com');
  });

  it('debe fallar con formato invalido', () => {
    expect(() => Email.create('no-email')).toThrow('Email inválido');
  });

  it('debe fallar sin TLD', () => {
    expect(() => Email.create('user@dominio')).toThrow('Email inválido');
  });

  it('debe fallar sin parte local', () => {
    expect(() => Email.create('@dominio.com')).toThrow('Email inválido');
  });

  it('debe fallar con dominio empezando con punto', () => {
    expect(() => Email.create('user@.com')).toThrow('Email inválido');
  });
});
