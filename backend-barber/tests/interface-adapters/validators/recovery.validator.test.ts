import {
  requestResetSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
  default as recoverySchemas,
} from '../../../src/interface-adapters/validators/recovery.validator';

const validRequestReset = {
  email: 'test@example.com',
};

const validResetPassword = {
  code: '123456',
  password: 'NewPass1',
  repeatPassword: 'NewPass1',
  email: 'test@example.com',
};

describe('requestResetSchema', () => {
  it('debe aceptar un email valido', () => {
    const { error } = requestResetSchema.validate(validRequestReset);
    expect(error).toBeUndefined();
  });

  it('debe rechazar email invalido', () => {
    const { error } = requestResetSchema.validate({ email: 'invalido' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email vacio', () => {
    const { error } = requestResetSchema.validate({ email: '' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email ausente', () => {
    const { error } = requestResetSchema.validate({});
    expect(error).toBeDefined();
  });
});

describe('resetPasswordSchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = resetPasswordSchema.validate(validResetPassword);
    expect(error).toBeUndefined();
  });

  it('debe rechazar codigo ausente', () => {
    const { code, ...payload } = validResetPassword;
    const { error } = resetPasswordSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar codigo vacio', () => {
    const { error } = resetPasswordSchema.validate({ ...validResetPassword, code: '' });
    expect(error).toBeDefined();
  });

  it('debe rechazar codigo que no son 6 digitos', () => {
    const { error } = resetPasswordSchema.validate({ ...validResetPassword, code: '123' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password menor a 8 caracteres', () => {
    const { error } = resetPasswordSchema.validate({ ...validResetPassword, password: 'Aa1' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password sin mayuscula', () => {
    const { error } = resetPasswordSchema.validate({ ...validResetPassword, password: 'password1' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password sin minuscula', () => {
    const { error } = resetPasswordSchema.validate({ ...validResetPassword, password: 'PASSWORD1' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password sin numero', () => {
    const { error } = resetPasswordSchema.validate({ ...validResetPassword, password: 'Password' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password ausente', () => {
    const { password, ...payload } = validResetPassword;
    const { error } = resetPasswordSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar repeatPassword que no coincide', () => {
    const { error } = resetPasswordSchema.validate({ ...validResetPassword, repeatPassword: 'OtraPass1' });
    expect(error).toBeDefined();
  });

  it('debe rechazar repeatPassword ausente', () => {
    const { repeatPassword, ...payload } = validResetPassword;
    const { error } = resetPasswordSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar email invalido (usa .email() no pattern)', () => {
    const { error } = resetPasswordSchema.validate({ ...validResetPassword, email: 'no-es-email' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email ausente', () => {
    const { email, ...payload } = validResetPassword;
    const { error } = resetPasswordSchema.validate(payload);
    expect(error).toBeDefined();
  });
});

describe('verifyResetCodeSchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = verifyResetCodeSchema.validate({ email: 'test@example.com', code: '123456' });
    expect(error).toBeUndefined();
  });

  it('debe rechazar codigo ausente', () => {
    const { error } = verifyResetCodeSchema.validate({ email: 'test@example.com' });
    expect(error).toBeDefined();
  });

  it('debe rechazar codigo con formato invalido', () => {
    const { error } = verifyResetCodeSchema.validate({ email: 'test@example.com', code: 'abc123' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email invalido', () => {
    const { error } = verifyResetCodeSchema.validate({ email: 'no-es-email', code: '123456' });
    expect(error).toBeDefined();
  });
});

describe('default export', () => {
  it('debe contener requestResetSchema, verifyResetCodeSchema y resetPasswordSchema', () => {
    expect(recoverySchemas.requestResetSchema).toBe(requestResetSchema);
    expect(recoverySchemas.verifyResetCodeSchema).toBe(verifyResetCodeSchema);
    expect(recoverySchemas.resetPasswordSchema).toBe(resetPasswordSchema);
  });
});
