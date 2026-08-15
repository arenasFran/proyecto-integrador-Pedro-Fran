import { RequestPasswordResetUseCase } from '../../../../src/application/use-cases/password/RequestPasswordResetUseCase';
import { VerifyPasswordResetCodeUseCase } from '../../../../src/application/use-cases/password/VerifyPasswordResetCodeUseCase';
import { ResetPasswordUseCase } from '../../../../src/application/use-cases/password/ResetPasswordUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { IHashService } from '../../../../src/application/ports/IHashService';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { User } from '../../../../src/domain/entities/User';
import { PasswordResetToken } from '../../../../src/domain/entities/PasswordResetToken';
import { makeMockUserRepository, makeMockPasswordResetRepository, makeMockRefreshTokenRepository, makeMockEmailService, makeMockHashService, makeMockPasswordHasher } from '../../../test-utils/mocks';

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

  const makeTokenDoc = () =>
    PasswordResetToken.create({
      id: 'token-1',
      userId: 'user-1',
      expiresAt: now,
    });

  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let passwordResetRepository: ReturnType<typeof makeMockPasswordResetRepository>;
  let refreshTokenRepository: ReturnType<typeof makeMockRefreshTokenRepository>;
  let emailService: jest.Mocked<IEmailService>;
  let hashService: jest.Mocked<IHashService>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    passwordResetRepository = makeMockPasswordResetRepository();
    refreshTokenRepository = makeMockRefreshTokenRepository();
    emailService = makeMockEmailService();
    hashService = makeMockHashService();
    passwordHasher = makeMockPasswordHasher();
  });

  describe('RequestPasswordResetUseCase', () => {
    it('debe NO enviar email ni generar código si el usuario es authProvider google', async () => {
      const googleUser = User.create({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Juan',
        lastname: 'Perez',
        kind: 'Registrado',
        authProvider: 'google',
      });

      userRepository.findByEmail.mockResolvedValue(googleUser);

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

    it('debe generar un código de 6 dígitos, guardarlo hasheado y enviar el email', async () => {
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

      const sentEmail = emailService.sendMail.mock.calls[0][0];
      const codeInEmail = /(\d{6})/.exec(sentEmail.html ?? '');
      expect(codeInEmail).not.toBeNull();
      expect(codeInEmail![1]).toMatch(/^\d{6}$/);

      expect(passwordResetRepository.create).toHaveBeenCalledWith(
        'user-1',
        'hash',
        expect.any(Date)
      );
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Tu código para restablecer la contraseña',
        })
      );
      expect(result.message).toMatch(/Si el email existe/);
      jest.useRealTimers();
    });
  });

  describe('VerifyPasswordResetCodeUseCase', () => {
    it('debe verificar el código sin consumirlo', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      hashService.sha256.mockReturnValue('hash');
      passwordResetRepository.verify.mockResolvedValue(makeTokenDoc());

      const useCase = new VerifyPasswordResetCodeUseCase(
        userRepository,
        passwordResetRepository,
        hashService
      );

      const result = await useCase.execute({ email: 'test@example.com', code: '123456' });

      expect(hashService.sha256).toHaveBeenCalledWith('123456');
      expect(passwordResetRepository.verify).toHaveBeenCalledWith('hash');
      expect(passwordResetRepository.verifyAndConsume).not.toHaveBeenCalled();
      expect(result.message).toMatch(/Código verificado/);
    });

    it('debe fallar si el código es inválido e incrementar el contador de intentos', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      hashService.sha256.mockReturnValue('hash');
      passwordResetRepository.verify.mockResolvedValue(null);

      const useCase = new VerifyPasswordResetCodeUseCase(
        userRepository,
        passwordResetRepository,
        hashService
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '000000' })
      ).rejects.toBeInstanceOf(AppError);

      expect(userRepository.updateUserSecurity).toHaveBeenCalledWith('user-1', {
        resetFailedAttempts: 1,
      });
    });

    it('debe fallar si el código pertenece a otro usuario', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      hashService.sha256.mockReturnValue('hash');
      passwordResetRepository.verify.mockResolvedValue(
        PasswordResetToken.create({ id: 'token-1', userId: 'user-2', expiresAt: now })
      );

      const useCase = new VerifyPasswordResetCodeUseCase(
        userRepository,
        passwordResetRepository,
        hashService
      );

      await expect(
        useCase.execute({ email: 'test@example.com', code: '123456' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe bloquear al usuario al alcanzar 5 intentos fallidos', async () => {
      let currentAttempts = 0;
      userRepository.findByEmail.mockImplementation(async () =>
        User.create({
          id: 'user-1',
          email: 'test@example.com',
          name: 'Juan',
          lastname: 'Perez',
          phone: '123456789',
          kind: 'Registrado',
          authProvider: 'local',
          passwordHash: 'hash',
          resetFailedAttempts: currentAttempts,
        })
      );
      userRepository.updateUserSecurity.mockImplementation(async (_userId, update) => {
        if (update.resetFailedAttempts !== undefined) {
          currentAttempts = update.resetFailedAttempts;
        }
      });
      hashService.sha256.mockReturnValue('hash');
      passwordResetRepository.verify.mockResolvedValue(null);

      const useCase = new VerifyPasswordResetCodeUseCase(
        userRepository,
        passwordResetRepository,
        hashService
      );

      for (let i = 0; i < 5; i++) {
        await expect(
          useCase.execute({ email: 'test@example.com', code: '000000' })
        ).rejects.toBeInstanceOf(AppError);
      }

      expect(userRepository.updateUserSecurity).toHaveBeenLastCalledWith(
        'user-1',
        expect.objectContaining({ resetLockedUntil: expect.any(Date) })
      );
    });
  });

  describe('ResetPasswordUseCase', () => {
    it('debe fallar si el código es inválido', async () => {
      passwordResetRepository.verifyAndConsume.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(makeUser());

      const useCase = new ResetPasswordUseCase(
        userRepository,
        passwordResetRepository,
        passwordHasher,
        hashService,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ code: '000000', password: 'Abcd1234', repeatPassword: 'Abcd1234', email: 'test@example.com' })
      ).rejects.toBeInstanceOf(AppError);
    });

    it('debe actualizar el password si el código es valido (y consumirlo)', async () => {
      passwordResetRepository.verifyAndConsume.mockResolvedValue(makeTokenDoc());
      passwordHasher.hash.mockResolvedValue('hash');
      hashService.sha256.mockReturnValue('hash');
      userRepository.findByEmail.mockResolvedValue(makeUser());

      const useCase = new ResetPasswordUseCase(
        userRepository,
        passwordResetRepository,
        passwordHasher,
        hashService,
        refreshTokenRepository
      );

      const result = await useCase.execute({
        code: '123456',
        password: 'Abcd1234',
        repeatPassword: 'Abcd1234',
        email: 'test@example.com',
      });

      expect(hashService.sha256).toHaveBeenCalledWith('123456');
      expect(passwordResetRepository.verifyAndConsume).toHaveBeenCalledWith('hash');
      expect(userRepository.updatePassword).toHaveBeenCalledWith('user-1', 'hash');
      expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1');
      expect(result.message).toMatch(/Contraseña restablecida/);
    });

    it('debe fallar si el usuario no existe', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      const useCase = new ResetPasswordUseCase(
        userRepository,
        passwordResetRepository,
        passwordHasher,
        hashService,
        refreshTokenRepository
      );

      await expect(
        useCase.execute({ code: '123456', password: 'Abcd1234', repeatPassword: 'Abcd1234', email: 'nadie@example.com' })
      ).rejects.toBeInstanceOf(AppError);

      expect(passwordResetRepository.verifyAndConsume).not.toHaveBeenCalled();
    });
  });
});
