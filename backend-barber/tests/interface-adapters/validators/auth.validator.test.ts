import {
  registerSchema,
  loginSchema,
  googleLoginSchema,
  twoFactorSendSchema,
  twoFactorVerifySchema,
  completeGoogleProfileSchema,
  refreshTokenSchema,
} from '../../../src/interface-adapters/validators/auth.validator';

const validRegister = {
  email: 'test@example.com',
  password: 'Password1',
  repeatPassword: 'Password1',
  name: 'Juan',
  lastname: 'Perez',
  phone: '1234567890',
  termsVersion: '1.0',
  privacyVersion: '1.0',
};

const validLogin = {
  email: 'test@example.com',
  password: 'Password1',
};

const validGoogleLogin = {
  token: 'google-token-abc123',
};

const validTwoFactorSend = {
  email: 'test@example.com',
  password: 'Password1',
};

const validTwoFactorVerify = {
  email: 'test@example.com',
  code: '123456',
};

const validCompleteGoogleProfile = {
  partialToken: 'partial-token-abc',
  name: 'Juan',
  phone: '123456789',
};

const validRefreshToken = {
  refreshToken: 'refresh-token-abc',
};

describe('registerSchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = registerSchema.validate(validRegister);
    expect(error).toBeUndefined();
  });

  it('debe rechazar email invalido', () => {
    const { error } = registerSchema.validate({ ...validRegister, email: 'invalido' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email vacio', () => {
    const { error } = registerSchema.validate({ ...validRegister, email: '' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email ausente', () => {
    const { email, ...payload } = validRegister;
    const { error } = registerSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar password menor a 8 caracteres', () => {
    const { error } = registerSchema.validate({ ...validRegister, password: 'Aa1' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password sin mayuscula', () => {
    const { error } = registerSchema.validate({ ...validRegister, password: 'password1' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password sin minuscula', () => {
    const { error } = registerSchema.validate({ ...validRegister, password: 'PASSWORD1' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password sin numero', () => {
    const { error } = registerSchema.validate({ ...validRegister, password: 'Password' });
    expect(error).toBeDefined();
  });

  it('debe rechazar password ausente', () => {
    const { password, ...payload } = validRegister;
    const { error } = registerSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar repeatPassword que no coincide', () => {
    const { error } = registerSchema.validate({ ...validRegister, repeatPassword: 'otraPass1' });
    expect(error).toBeDefined();
  });

  it('debe rechazar repeatPassword ausente', () => {
    const { repeatPassword, ...payload } = validRegister;
    const { error } = registerSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar name menor a 3 caracteres', () => {
    const { error } = registerSchema.validate({ ...validRegister, name: 'Ju' });
    expect(error).toBeDefined();
  });

  it('debe rechazar name ausente', () => {
    const { name, ...payload } = validRegister;
    const { error } = registerSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar lastname menor a 3 caracteres', () => {
    const { error } = registerSchema.validate({ ...validRegister, lastname: 'Pe' });
    expect(error).toBeDefined();
  });

  it('debe rechazar lastname ausente', () => {
    const { lastname, ...payload } = validRegister;
    const { error } = registerSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar phone ausente', () => {
    const { phone, ...payload } = validRegister;
    const { error } = registerSchema.validate(payload);
    expect(error).toBeDefined();
  });
});

describe('loginSchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = loginSchema.validate(validLogin);
    expect(error).toBeUndefined();
  });

  it('debe rechazar email invalido', () => {
    const { error } = loginSchema.validate({ ...validLogin, email: 'invalido' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email ausente', () => {
    const { email, ...payload } = validLogin;
    const { error } = loginSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar password ausente', () => {
    const { password, ...payload } = validLogin;
    const { error } = loginSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar password vacio', () => {
    const { error } = loginSchema.validate({ ...validLogin, password: '' });
    expect(error).toBeDefined();
  });
});

describe('googleLoginSchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = googleLoginSchema.validate(validGoogleLogin);
    expect(error).toBeUndefined();
  });

  it('debe rechazar token ausente', () => {
    const { token, ...payload } = validGoogleLogin;
    const { error } = googleLoginSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar token vacio', () => {
    const { error } = googleLoginSchema.validate({ token: '' });
    expect(error).toBeDefined();
  });

  it('debe rechazar token que no es string', () => {
    const { error } = googleLoginSchema.validate({ token: 123 });
    expect(error).toBeDefined();
  });
});

describe('twoFactorSendSchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = twoFactorSendSchema.validate(validTwoFactorSend);
    expect(error).toBeUndefined();
  });

  it('debe rechazar email invalido', () => {
    const { error } = twoFactorSendSchema.validate({ ...validTwoFactorSend, email: 'invalido' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email ausente', () => {
    const { email, ...payload } = validTwoFactorSend;
    const { error } = twoFactorSendSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar password ausente', () => {
    const { password, ...payload } = validTwoFactorSend;
    const { error } = twoFactorSendSchema.validate(payload);
    expect(error).toBeDefined();
  });
});

describe('twoFactorVerifySchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = twoFactorVerifySchema.validate(validTwoFactorVerify);
    expect(error).toBeUndefined();
  });

  it('debe rechazar email invalido', () => {
    const { error } = twoFactorVerifySchema.validate({ ...validTwoFactorVerify, email: 'invalido' });
    expect(error).toBeDefined();
  });

  it('debe rechazar email ausente', () => {
    const { email, ...payload } = validTwoFactorVerify;
    const { error } = twoFactorVerifySchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar code con longitud distinta de 6', () => {
    const { error } = twoFactorVerifySchema.validate({ ...validTwoFactorVerify, code: '12345' });
    expect(error).toBeDefined();
  });

  it('debe rechazar code vacio', () => {
    const { error } = twoFactorVerifySchema.validate({ ...validTwoFactorVerify, code: '' });
    expect(error).toBeDefined();
  });

  it('debe rechazar code ausente', () => {
    const { code, ...payload } = validTwoFactorVerify;
    const { error } = twoFactorVerifySchema.validate(payload);
    expect(error).toBeDefined();
  });
});

describe('completeGoogleProfileSchema', () => {
  it('debe aceptar un payload valido con partialToken, name y phone', () => {
    const { error } = completeGoogleProfileSchema.validate(validCompleteGoogleProfile);
    expect(error).toBeUndefined();
  });

  it('debe aceptar un payload con lastname', () => {
    const { error } = completeGoogleProfileSchema.validate({
      ...validCompleteGoogleProfile,
      lastname: 'Gomez',
    });
    expect(error).toBeUndefined();
  });

  it('debe aceptar lastname vacio (allow "")', () => {
    const { error } = completeGoogleProfileSchema.validate({
      ...validCompleteGoogleProfile,
      lastname: '',
    });
    expect(error).toBeUndefined();
  });

  it('debe rechazar partialToken ausente', () => {
    const { partialToken, ...payload } = validCompleteGoogleProfile;
    const { error } = completeGoogleProfileSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar name ausente', () => {
    const { name, ...payload } = validCompleteGoogleProfile;
    const { error } = completeGoogleProfileSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar name vacio', () => {
    const { error } = completeGoogleProfileSchema.validate({ ...validCompleteGoogleProfile, name: '' });
    expect(error).toBeDefined();
  });

  it('debe rechazar phone ausente', () => {
    const { phone, ...payload } = validCompleteGoogleProfile;
    const { error } = completeGoogleProfileSchema.validate(payload);
    expect(error).toBeDefined();
  });
});

describe('refreshTokenSchema', () => {
  it('debe aceptar un payload valido', () => {
    const { error } = refreshTokenSchema.validate(validRefreshToken);
    expect(error).toBeUndefined();
  });

  it('debe rechazar refreshToken ausente', () => {
    const { refreshToken, ...payload } = validRefreshToken;
    const { error } = refreshTokenSchema.validate(payload);
    expect(error).toBeDefined();
  });

  it('debe rechazar refreshToken vacio', () => {
    const { error } = refreshTokenSchema.validate({ refreshToken: '' });
    expect(error).toBeDefined();
  });
});
