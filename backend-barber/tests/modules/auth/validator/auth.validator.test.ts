import { registerSchema } from '../../../../src/modules/auth/validator/auth.validator';

const validData = {
  email: 'user@example.com',
  password: 'secret123',
  repeatPassword: 'secret123',
  name: 'Test',
  lastname: 'User',
  phone: '1234567890',
};

describe('auth.validator – registerSchema', () => {
  it('valida correctamente cuando todos los campos son válidos', () => {
    const { error } = registerSchema.validate(validData);
    expect(error).toBeUndefined();
  });

  it('falla si el email no es válido', () => {
    const { error } = registerSchema.validate({ ...validData, email: 'not-an-email' });
    expect(error).toBeTruthy();
  });

  it('falla si el email está ausente', () => {
    const { error } = registerSchema.validate({ ...validData, email: undefined });
    expect(error).toBeTruthy();
  });

  it('falla si el password tiene menos de 6 caracteres', () => {
    const { error } = registerSchema.validate({ ...validData, password: '123', repeatPassword: '123' });
    expect(error).toBeTruthy();
  });

  it('falla si el password está ausente', () => {
    const { error } = registerSchema.validate({ ...validData, password: undefined, repeatPassword: undefined });
    expect(error).toBeTruthy();
  });

  it('falla si repeatPassword no coincide con password', () => {
    const { error } = registerSchema.validate({ ...validData, repeatPassword: 'different' });
    expect(error).toBeTruthy();
    expect(error?.details[0]?.message).toContain('Las contraseñas deben coincidir');
  });

  it('falla si repeatPassword está ausente', () => {
    const { error } = registerSchema.validate({ ...validData, repeatPassword: undefined });
    expect(error).toBeTruthy();
    expect(error?.details[0]?.message).toContain('La confirmación de contraseña es obligatoria');
  });

  it('falla si name tiene menos de 3 caracteres', () => {
    const { error } = registerSchema.validate({ ...validData, name: 'AB' });
    expect(error).toBeTruthy();
  });

  it('falla si name está ausente', () => {
    const { error } = registerSchema.validate({ ...validData, name: undefined });
    expect(error).toBeTruthy();
  });

  it('falla si lastname tiene menos de 3 caracteres', () => {
    const { error } = registerSchema.validate({ ...validData, lastname: 'AB' });
    expect(error).toBeTruthy();
  });

  it('falla si lastname está ausente', () => {
    const { error } = registerSchema.validate({ ...validData, lastname: undefined });
    expect(error).toBeTruthy();
  });

  it('falla si phone está ausente', () => {
    const { error } = registerSchema.validate({ ...validData, phone: undefined });
    expect(error).toBeTruthy();
  });
});
