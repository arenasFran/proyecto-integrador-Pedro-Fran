import { LoginUserUseCase } from '../../../../src/application/use-cases/auth/LoginUserUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { IEmailService } from '../../../../src/application/ports/IEmailService';
import { IRandomGenerator } from '../../../../src/application/ports/IRandomGenerator';
import { IHashService } from '../../../../src/application/ports/IHashService';
import { IDateTimeProvider } from '../../../../src/application/ports/IDateTimeProvider';
import { User, UserProps } from '../../../../src/domain/entities/User';

describe('LoginUserUseCase', () => {
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
    });

    return overrides ? User.create({ ...user.toPrimitives(), ...overrides }) : user;
  };

  let userRepository: jest.Mocked<IUserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let emailService: jest.Mocked<IEmailService>;
  let randomGenerator: jest.Mocked<IRandomGenerator>;
  let hashService: jest.Mocked<IHashService>;
  let dateTimeProvider: jest.Mocked<IDateTimeProvider>;
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
      updatePassword: jest.fn(),
      updateTwoFactor: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
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

    useCase = new LoginUserUseCase(
      userRepository,
      passwordHasher,
      emailService,
      randomGenerator,
      hashService,
      dateTimeProvider
    );
  });

  it('debe fallar si el usuario no existe', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute({ email: 'test@example.com', password: '123456' })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el usuario no tiene password local', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser({ passwordHash: undefined }));

    await expect(
      useCase.execute({ email: 'test@example.com', password: '123456' })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si la password es incorrecta', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser());
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute({ email: 'test@example.com', password: '123456' })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe enviar código 2FA y responder requiresTwoFactor en login exitoso', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser());
    passwordHasher.compare.mockResolvedValue(true);
    randomGenerator.generateNumericCode.mockReturnValue('123456');
    hashService.sha256.mockReturnValue('code-hash');
    dateTimeProvider.now.mockReturnValue(now);

    const result = await useCase.execute({
      email: 'test@example.com',
      password: '123456',
    });

    expect(emailService.sendMail).toHaveBeenCalled();
    expect(userRepository.updateTwoFactor).toHaveBeenCalled();
    expect(result).toEqual({ requiresTwoFactor: true });
  });
});
