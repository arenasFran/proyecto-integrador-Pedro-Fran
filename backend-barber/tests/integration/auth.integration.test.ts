import { MongoUserRepository } from '../../src/infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoRefreshTokenRepository } from '../../src/infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoAppointmentRepository } from '../../src/infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { RegisterUserUseCase } from '../../src/application/use-cases/auth/RegisterUserUseCase';
import { SendTwoFactorCodeUseCase } from '../../src/application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../../src/application/use-cases/auth/VerifyTwoFactorUseCase';
import { BcryptPasswordHasher } from '../../src/infrastructure/services/BcryptPasswordHasher';
import { HashService } from '../../src/infrastructure/services/HashService';
import { JwtTokenService } from '../../src/infrastructure/services/JwtTokenService';
import { FakeEmailService } from '../../src/infrastructure/services/FakeEmailService';
import { seedRegisteredClient } from '../test-utils/factories';
import { AppError } from '../../src/domain/errors/AppError';
import { RegisteredClient } from '../../src/infrastructure/repositories/mongodb/models/client.model';
import jwt from 'jsonwebtoken';

const userRepo = new MongoUserRepository();
const refreshTokenRepo = new MongoRefreshTokenRepository();
const appointmentRepo = new MongoAppointmentRepository();
const hasher = new BcryptPasswordHasher();
const hashService = new HashService();
const emailService = new FakeEmailService();
const tokenService = new JwtTokenService({
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  partialSecret: process.env.JWT_PARTIAL_SECRET!,
  accessTokenExpiresIn: '15m',
  refreshTokenExpiresIn: '7d',
  issuer: 'barberia-api',
  audience: 'barberia-client',
});

beforeEach(() => {
  FakeEmailService.clear();
});

describe('RegisterUserUseCase (hash real en DB)', () => {
  it('hashea la contraseña con bcrypt ($2b$) y la persiste en RegisteredClient', async () => {
    const registerUC = new RegisterUserUseCase(userRepo, hasher, appointmentRepo);
    await registerUC.execute({
      email: 'registro@test.com',
      password: 'Registro123!',
      repeatPassword: 'Registro123!',
      name: 'Test',
      lastname: 'User',
      phone: '099444444',
      termsVersion: '1.0',
      privacyVersion: '1.0',
    });

    const user = await userRepo.findByEmail('registro@test.com');
    expect(user).not.toBeNull();
    expect(user!.passwordHash).toMatch(/^\$2[aby]?\$/);
    await expect(hasher.compare('Registro123!', user!.passwordHash!)).resolves.toBe(true);

    const doc = await RegisteredClient.findOne({ email: 'registro@test.com' }).lean();
    expect(doc).not.toBeNull();
    expect(doc!.password).toMatch(/^\$2[aby]?\$/);
  });
});

describe('Login completo con código 2FA', () => {
  it('envía código, lo verifica y devuelve token + refreshToken válidos', async () => {
    const { clientId, email } = await seedRegisteredClient({ email: 'login@test.com' });

    const sendUC = new SendTwoFactorCodeUseCase(userRepo, hasher, emailService, hashService);
    const sendResult = await sendUC.execute({ email, password: 'Client1234!' });
    expect(sendResult.message).toBe('Código enviado al email');

    const code = FakeEmailService.getCode(email);
    expect(code).toBeDefined();
    expect(code).toHaveLength(6);

    const verifyUC = new VerifyTwoFactorUseCase(userRepo, tokenService, hashService, refreshTokenRepo);
    const verifyResult = await verifyUC.execute({ email, code: code! });

    expect(verifyResult.token).toBeDefined();
    expect(verifyResult.refreshToken).toBeDefined();

    const decoded = jwt.verify(verifyResult.token, process.env.JWT_ACCESS_SECRET!, {
      algorithms: ['HS256'],
      issuer: 'barberia-api',
      audience: 'barberia-client',
    }) as { id: string };
    expect(decoded.id).toBe(clientId);

    const tokenHash = hashService.sha256(verifyResult.refreshToken);
    const storedRefreshToken = await refreshTokenRepo.findByTokenHash(tokenHash);
    expect(storedRefreshToken).not.toBeNull();
    expect(storedRefreshToken!.userId).toBe(clientId);

    const userAfter = await userRepo.findByEmail(email);
    expect(userAfter!.lastLoginAt).toBeDefined();
  });
});

describe('Bloqueo por intentos fallidos (lockout)', () => {
  it('lanza 401 en los primeros 4 intentos y 429 en el quinto', async () => {
    await seedRegisteredClient({ email: 'lockout@test.com' });

    const sendUC = new SendTwoFactorCodeUseCase(userRepo, hasher, emailService, hashService);

    for (let i = 1; i <= 4; i++) {
      await expect(
        sendUC.execute({ email: 'lockout@test.com', password: 'WrongPass1!' }),
      ).rejects.toThrow(expect.objectContaining({ statusCode: 401 }));
    }

    await expect(
      sendUC.execute({ email: 'lockout@test.com', password: 'WrongPass1!' }),
    ).rejects.toThrow(expect.objectContaining({ statusCode: 429 }));

    const user = await userRepo.findByEmail('lockout@test.com');
    expect(user!.twoFactorFailedAttempts).toBe(5);
    expect(user!.twoFactorLockedUntil).toBeDefined();
    expect(user!.twoFactorLockedUntil!.getTime()).toBeGreaterThan(Date.now());
  });
});
