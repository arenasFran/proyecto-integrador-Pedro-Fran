import { SendTwoFactorCodeUseCase } from '../../../../src/application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../../../../src/application/use-cases/auth/VerifyTwoFactorUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { IHashService } from '../../../../src/application/ports/IHashService';
import { ITokenService } from '../../../../src/application/ports/ITokenService';
import { User, UserProps } from '../../../../src/domain/entities/User';
import { makeMockUserRepository, makeMockPasswordHasher, makeMockEmailService, makeMockHashService, makeMockTokenService, makeMockRefreshTokenRepository } from '../../../test-utils/mocks';

describe('TwoFactor use cases', () => {
  const now = new Date('2024-01-01T10:00:00.000Z');

  const makeUser = (overrides?: Partial<UserProps>) => {
    const user = User.create({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
      kind: 'Registrado',
      authProvider: 'local',
      passwordHash: 'hash',
      twoFactor: {
        codeHash: 'hash-2fa',
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      },
    });

    return overrides ? User.create({ ...user.toPrimitives(), ...overrides }) : user;
  };

  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let emailService: jest.Mocked<IEmailService>;
  let hashService: jest.Mocked<IHashService>;
  let tokenService: jest.Mocked<ITokenService>;
  let refreshTokenRepository: ReturnType<typeof makeMockRefreshTokenRepository>;

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    passwordHasher = makeMockPasswordHasher();
    emailService = makeMockEmailService();
    hashService = makeMockHashService();
    tokenService = makeMockTokenService();
    refreshTokenRepository = makeMockRefreshTokenRepository();
  });

  describe('SendTwoFactorCodeUseCase', () => {
    it('debe fallar si el usuario no existe', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const useCase = new SendTwoFactorCodeUseCase(
        userRepository,
        passwordHasher,
        emailService,
        hashService
      );

      await expect(
        useCase.execute({ email: 'test@example.com', password: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe fallar si el usuario es solo Google', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser({ passwordHash: undefined }));
      const useCase = new SendTwoFactorCodeUseCase(
        userRepository,
        passwordHasher,
        emailService,
        hashService
      );

      await expect(
        useCase.execute({ email: 'test@example.com', password: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe fallar si la password es incorrecta', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(false);
      const useCase = new SendTwoFactorCodeUseCase(
        userRepository,
        passwordHasher,
        emailService,
        hashService
      );

      await expect(
        useCase.execute({ email: 'test@example.com', password: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe incrementar twoFactorFailedAttempts si la password es incorrecta (mismo contador que el código 2FA)', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser({ twoFactorFailedAttempts: 2 }));
      passwordHasher.compare.mockResolvedValue(false);
      const useCase = new SendTwoFactorCodeUseCase(
        userRepository,
        passwordHasher,
        emailService,
        hashService
      );

      await expect(
        useCase.execute({ email: 'test@example.com', password: 'incorrecta' })
      ).rejects.toMatchObject({ statusCode: 401 });

      expect(userRepository.updateUserSecurity).toHaveBeenCalledWith('user-1', {
        twoFactorFailedAttempts: 3,
      });
    });

    it('debe bloquear la cuenta 15 minutos tras 5 intentos fallidos de password', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser({ twoFactorFailedAttempts: 4 }));
      passwordHasher.compare.mockResolvedValue(false);
      const useCase = new SendTwoFactorCodeUseCase(
        userRepository,
        passwordHasher,
        emailService,
        hashService
      );

      await expect(
        useCase.execute({ email: 'test@example.com', password: 'incorrecta' })
      ).rejects.toMatchObject({ statusCode: 429 });

      expect(userRepository.updateUserSecurity).toHaveBeenCalledWith('user-1', {
        twoFactorFailedAttempts: 5,
        twoFactorLockedUntil: expect.any(Date),
      });
    });

    it('debe rechazar el envío si la cuenta ya está bloqueada, sin llegar a validar la password', async () => {
      userRepository.findByEmail.mockResolvedValue(
        makeUser({ twoFactorLockedUntil: new Date(now.getTime() + 10 * 60 * 1000) })
      );
      jest.useFakeTimers({ now });
      const useCase = new SendTwoFactorCodeUseCase(
        userRepository,
        passwordHasher,
        emailService,
        hashService
      );

      await expect(
        useCase.execute({ email: 'test@example.com', password: 'lo-que-sea' })
      ).rejects.toMatchObject({ statusCode: 429 });

      expect(passwordHasher.compare).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('debe enviar el codigo y actualizar 2FA', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(true);
      hashService.sha256.mockReturnValue('hash-2fa');
      jest.useFakeTimers({ now: now });

      const useCase = new SendTwoFactorCodeUseCase(
        userRepository,
        passwordHasher,
        emailService,
        hashService
      );

      const result = await useCase.execute({
        email: 'test@example.com',
        password: '123456',
      });

      expect(userRepository.updateTwoFactor).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          codeHash: 'hash-2fa',
          expiresAt: expect.any(Date),
        })
      );
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Tu código de verificación',
        })
      );
      expect(result.message).toMatch(/Código enviado/);
      jest.useRealTimers();
    });
  });

  describe('VerifyTwoFactorUseCase', () => {
    it('debe fallar si el usuario no existe', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe fallar si no hay codigo activo', async () => {
      userRepository.findByEmail.mockResolvedValue(
        makeUser({ twoFactor: { codeHash: undefined, expiresAt: undefined } })
      );
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe fallar si el codigo expiro', async () => {
      userRepository.findByEmail.mockResolvedValue(
        makeUser({
          twoFactor: {
            codeHash: 'hash-2fa',
            expiresAt: new Date(now.getTime() - 1000),
          },
        })
      );
      jest.useFakeTimers({ now: now });
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toBeInstanceOf(AppError);
      expect(userRepository.updateTwoFactor).toHaveBeenCalledWith(
        'user-1',
        { codeHash: undefined, expiresAt: undefined }
      );
      jest.useRealTimers();
    });

    it('debe fallar si el codigo es incorrecto', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      jest.useFakeTimers({ now: now });
      hashService.sha256.mockReturnValue('hash-diferente');
      hashService.constantTimeEqual.mockReturnValue(false);
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toBeInstanceOf(AppError);
      jest.useRealTimers();
    });

    it('debe incrementar twoFactorFailedAttempts si el codigo es incorrecto', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser({ twoFactorFailedAttempts: 1 }));
      jest.useFakeTimers({ now: now });
      hashService.sha256.mockReturnValue('hash-diferente');
      hashService.constantTimeEqual.mockReturnValue(false);
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toMatchObject({ statusCode: 401 });

      expect(userRepository.updateUserSecurity).toHaveBeenCalledWith('user-1', {
        twoFactorFailedAttempts: 2,
      });
      jest.useRealTimers();
    });

    it('debe bloquear la cuenta 15 minutos tras 5 intentos fallidos de codigo', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser({ twoFactorFailedAttempts: 4 }));
      jest.useFakeTimers({ now: now });
      hashService.sha256.mockReturnValue('hash-diferente');
      hashService.constantTimeEqual.mockReturnValue(false);
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toMatchObject({ statusCode: 429 });

      expect(userRepository.updateUserSecurity).toHaveBeenCalledWith('user-1', {
        twoFactorFailedAttempts: 5,
        twoFactorLockedUntil: expect.any(Date),
      });
      jest.useRealTimers();
    });

    it('debe devolver token cuando el codigo es correcto', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      jest.useFakeTimers({ now: now });
      hashService.sha256.mockReturnValue('hash-2fa');
      hashService.constantTimeEqual.mockReturnValue(true);
      tokenService.signAccessToken.mockReturnValue('token');
      tokenService.signRefreshToken.mockReturnValue('refresh-token');
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        refreshTokenRepository
      );

      const result = await useCase.execute({ email: 'test@example.com', code: '123456' });

      expect(userRepository.updateTwoFactor).toHaveBeenCalledWith(
        'user-1',
        { codeHash: undefined, expiresAt: undefined }
      );
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'Login exitoso', token: 'token', refreshToken: 'refresh-token' });
      jest.useRealTimers();
    });
  });
});
