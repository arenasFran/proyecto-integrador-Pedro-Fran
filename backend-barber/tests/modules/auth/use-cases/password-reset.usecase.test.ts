import { RequestPasswordResetUseCase } from '../../../../src/application/use-cases/password/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../../../src/application/use-cases/password/ResetPasswordUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { IPasswordResetRepository } from '../../../../src/domain/repositories/IPasswordResetRepository';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { IRandomGenerator } from '../../../../src/application/ports/IRandomGenerator';
import { IHashService } from '../../../../src/application/ports/IHashService';
import { IDateTimeProvider } from '../../../../src/application/ports/IDateTimeProvider';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { User } from '../../../../src/domain/entities/User';
import { PasswordResetToken } from '../../../../src/domain/entities/PasswordResetToken';

describe('Password reset use cases', () => {
  const now = new Date('2024-01-01T10:00:00.000Z');

  const makeUser = () => {
    return User.create({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
      kind: 'Registrado',
      authProvider: 'local',
      passwordHash: 'hash',
    });
  };

  let userRepository: jest.Mocked<IUserRepository>;
  let passwordResetRepository: jest.Mocked<IPasswordResetRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let randomGenerator: jest.Mocked<IRandomGenerator>;
  let hashService: jest.Mocked<IHashService>;
  let dateTimeProvider: jest.Mocked<IDateTimeProvider>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
      updatePassword: jest.fn(),
      updateTwoFactor: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    passwordResetRepository = {
      create: jest.fn(),
      verifyAndConsume: jest.fn(),
    };

    emailService = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    randomGenerator = {
      generateNumericCode: jest.fn(),
      generateHexToken: jest.fn(),
    };

    hashService = {
      sha256: jest.fn(),
    };

    dateTimeProvider = {
      now: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };
  });

  describe('RequestPasswordResetUseCase', () => {
    it('debe responder igual aunque el usuario no exista', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const useCase = new RequestPasswordResetUseCase(
        userRepository,
        passwordResetRepository,
        emailService,
        randomGenerator,
        hashService,
        dateTimeProvider,
        'http://localhost:5173',
        60
      );

      const result = await useCase.execute({ email: 'test@example.com' });

      expect(passwordResetRepository.create).not.toHaveBeenCalled();
      expect(emailService.sendMail).not.toHaveBeenCalled();
      expect(result.message).toMatch(/Si el email existe/);
    });

    it('debe generar token y enviar email si el usuario existe', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      randomGenerator.generateHexToken.mockReturnValue('token');
      hashService.sha256.mockReturnValue('hash');
      dateTimeProvider.now.mockReturnValue(now);

      const useCase = new RequestPasswordResetUseCase(
        userRepository,
        passwordResetRepository,
        emailService,
        randomGenerator,
        hashService,
        dateTimeProvider,
        'http://localhost:5173',
        60
      );

      const result = await useCase.execute({ email: 'test@example.com' });

      expect(passwordResetRepository.create).toHaveBeenCalled();
      expect(emailService.sendMail).toHaveBeenCalled();
      expect(result.message).toMatch(/Si el email existe/);
    });
  });

  describe('ResetPasswordUseCase', () => {
    it('debe fallar si el token es invalido', async () => {
      passwordResetRepository.verifyAndConsume.mockResolvedValue(null);

      const useCase = new ResetPasswordUseCase(
        userRepository,
        passwordResetRepository,
        passwordHasher,
        hashService
      );

      await expect(
        useCase.execute({ token: 'token', password: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe actualizar el password si el token es valido', async () => {
      passwordResetRepository.verifyAndConsume.mockResolvedValue(
        PasswordResetToken.create({
          id: 'token-1',
          userId: 'user-1',
          expiresAt: now,
        })
      );
      passwordHasher.hash.mockResolvedValue('hash');

      const useCase = new ResetPasswordUseCase(
        userRepository,
        passwordResetRepository,
        passwordHasher,
        hashService
      );

      const result = await useCase.execute({
        token: 'token',
        password: '123456',
      });

      expect(userRepository.updatePassword).toHaveBeenCalledWith('user-1', 'hash');
      expect(result.message).toBeTruthy();
    });
  });
});
