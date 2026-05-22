import { Email } from '../../../src/domain/value-objects/Email';

describe('Email', () => {
  it('debe normalizar y validar el email', () => {
    const email = Email.create('  TEST@Example.com ');
    expect(email.getValue()).toBe('test@example.com');
  });

  it('debe fallar con formato invalido', () => {
    expect(() => Email.create('no-email')).toThrow('Email invalido');
  });
});
