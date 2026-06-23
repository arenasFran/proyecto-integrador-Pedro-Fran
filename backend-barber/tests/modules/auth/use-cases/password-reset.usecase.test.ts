import { RequestPasswordResetUseCase } from '../../../../src/application/use-cases/password/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../../../src/application/use-cases/password/ResetPasswordUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { IHashService } from '../../../../src/application/ports/IHashService';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { User } from '../../../../src/domain/entities/User';
import { PasswordResetToken } from '../../../../src/domain/entities/PasswordResetToken';
import { makeMockUserRepository, makeMockPasswordResetRepository, makeMockEmailService, makeMockHashService, makeMockPasswordHasher } from '../../../test-utils/mocks';

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

  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let passwordResetRepository: ReturnType<typeof makeMockPasswordResetRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let hashService: jest.Mocked<IHashService>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    passwordResetRepository = makeMockPasswordResetRepository();
    emailService = makeMockEmailService();
    hashService = makeMockHashService();
    passwordHasher = makeMockPasswordHasher();
  });

  describe('RequestPasswordResetUseCase', () => {
    it('debe responder igual aunque el usuario no exista', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const useCase = new RequestPasswordResetUseCase(
        userRepository,
        passwordResetRepository,
        emailService,
        hashService,
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
      hashService.sha256.mockReturnValue('hash');
      jest.useFakeTimers({ now: now });

      const useCase = new RequestPasswordResetUseCase(
        userRepository,
        passwordResetRepository,
        emailService,
        hashService,
        'http://localhost:5173',
        60
      );

      const result = await useCase.execute({ email: 'test@example.com' });

      expect(passwordResetRepository.create).toHaveBeenCalledWith(
        'user-1',
        'hash',
        expect.any(Date)
      );
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Restablece tu contraseña',
        })
      );
      expect(result.message).toMatch(/Si el email existe/);
      jest.useRealTimers();
    });
  });

  describe('ResetPasswordUseCase', () => {
    it('debe fallar si el token es invalido', async () => {
      passwordResetRepository.verifyAndConsume.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);

      const useCase = new ResetPasswordUseCase(
        userRepository,
        passwordResetRepository,
        passwordHasher,
        hashService
      );

      await expect(
        useCase.execute({ token: 'token', password: 'Abcd1234', repeatPassword: 'Abcd1234', email: 'test@example.com' })
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
      userRepository.findByEmail.mockResolvedValue(makeUser());

      const useCase = new ResetPasswordUseCase(
        userRepository,
        passwordResetRepository,
        passwordHasher,
        hashService
      );

      const result = await useCase.execute({
        token: 'token',
        password: 'Abcd1234',
        repeatPassword: 'Abcd1234',
        email: 'test@example.com',
      });

      expect(userRepository.updatePassword).toHaveBeenCalledWith('user-1', 'hash');
      expect(result.message).toMatch(/Contraseña restablecida/);
    });
  });
});
