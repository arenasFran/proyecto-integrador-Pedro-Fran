import { SendTwoFactorCodeUseCase } from '../../../../src/application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../../../../src/application/use-cases/auth/VerifyTwoFactorUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IRefreshTokenRepository } from '../../../../src/domain/repositories/IRefreshTokenRepository';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { IRandomGenerator } from '../../../../src/application/ports/IRandomGenerator';
import { IHashService } from '../../../../src/application/ports/IHashService';
import { IDateTimeProvider } from '../../../../src/application/ports/IDateTimeProvider';
import { ITokenService } from '../../../../src/application/ports/ITokenService';
import { User, UserProps } from '../../../../src/domain/entities/User';
import { makeMockUserRepository, makeMockPasswordHasher, makeMockEmailService, makeMockRandomGenerator, makeMockHashService, makeMockDateTimeProvider, makeMockTokenService, makeMockRefreshTokenRepository } from '../../../test-utils/mocks';

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

  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let emailService: jest.Mocked<IEmailService>;
  let randomGenerator: jest.Mocked<IRandomGenerator>;
  let hashService: jest.Mocked<IHashService>;
  let dateTimeProvider: jest.Mocked<IDateTimeProvider>;
  let tokenService: jest.Mocked<ITokenService>;
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    passwordHasher = makeMockPasswordHasher();
    emailService = makeMockEmailService();
    randomGenerator = makeMockRandomGenerator();
    hashService = makeMockHashService();
    dateTimeProvider = makeMockDateTimeProvider();
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
        randomGenerator,
        hashService,
        dateTimeProvider
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
        randomGenerator,
        hashService,
        dateTimeProvider
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
        randomGenerator,
        hashService,
        dateTimeProvider
      );

      await expect(
        useCase.execute({ email: 'test@example.com', password: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe enviar el codigo y actualizar 2FA', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(true);
      randomGenerator.generateNumericCode.mockReturnValue('123456');
      hashService.sha256.mockReturnValue('hash-2fa');
      dateTimeProvider.now.mockReturnValue(now);

      const useCase = new SendTwoFactorCodeUseCase(
        userRepository,
        passwordHasher,
        emailService,
        randomGenerator,
        hashService,
        dateTimeProvider
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
    });
  });

  describe('VerifyTwoFactorUseCase', () => {
    it('debe fallar si el usuario no existe', async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        dateTimeProvider,
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
        dateTimeProvider,
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
      dateTimeProvider.now.mockReturnValue(now);
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        dateTimeProvider,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toBeInstanceOf(AppError);
      expect(userRepository.updateTwoFactor).toHaveBeenCalledWith(
        'user-1',
        { codeHash: undefined, expiresAt: undefined }
      );
    });

    it('debe fallar si el codigo es incorrecto', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      dateTimeProvider.now.mockReturnValue(now);
      hashService.sha256.mockReturnValue('hash-diferente');
      hashService.constantTimeEqual.mockReturnValue(false);
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        dateTimeProvider,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe devolver token cuando el codigo es correcto', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      dateTimeProvider.now.mockReturnValue(now);
      hashService.sha256.mockReturnValue('hash-2fa');
      hashService.constantTimeEqual.mockReturnValue(true);
      tokenService.signAccessToken.mockReturnValue('token');
      tokenService.signRefreshToken.mockReturnValue('refresh-token');
      const useCase = new VerifyTwoFactorUseCase(
        userRepository,
        tokenService,
        hashService,
        dateTimeProvider,
        refreshTokenRepository
      );

      const result = await useCase.execute({ email: 'test@example.com', code: '123456' });

      expect(userRepository.updateTwoFactor).toHaveBeenCalledWith(
        'user-1',
        { codeHash: undefined, expiresAt: undefined }
      );
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'Login exitoso', token: 'token', refreshToken: 'refresh-token' });
    });
  });
});
