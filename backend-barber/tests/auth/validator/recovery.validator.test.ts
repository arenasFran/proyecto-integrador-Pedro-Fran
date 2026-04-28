import { requestResetSchema, resetPasswordSchema } from '../../../src/auth/validator/recovery.validator';

describe('recovery.validator', () => {
  it('resetPasswordSchema falla si repeatPassword no coincide', () => {
    const { error } = resetPasswordSchema.validate({
      token: 't',
      password: '123456',
      repeatPassword: 'xxxxxx',
    });

    expect(error).toBeTruthy();
    expect(error?.details[0]?.message).toContain('Las contraseñas deben coincidir');
  });

  it('resetPasswordSchema falla si password tiene menos de 6', () => {
    const { error } = resetPasswordSchema.validate({
      token: 't',
      password: '123',
      repeatPassword: '123',
    });

    expect(error).toBeTruthy();
  });

  it('requestResetSchema falla si email no es válido', () => {
    const { error } = requestResetSchema.validate({ email: 'not-an-email' });
    expect(error).toBeTruthy();
  });
});
