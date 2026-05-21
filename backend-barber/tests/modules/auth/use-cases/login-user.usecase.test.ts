import { LoginUserUseCase } from '../../../../src/application/use-cases/auth/LoginUserUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { ITokenService } from '../../../../src/application/ports/ITokenService';
import { User, UserProps } from '../../../../src/domain/entities/User';

describe('LoginUserUseCase', () => {
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
  let tokenService: jest.Mocked<ITokenService>;
  let useCase: LoginUserUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
      updatePassword: jest.fn(),
      updateTwoFactor: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    tokenService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    useCase = new LoginUserUseCase(userRepository, passwordHasher, tokenService);
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

  it('debe devolver token en login exitoso', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser());
    passwordHasher.compare.mockResolvedValue(true);
    tokenService.sign.mockReturnValue('token');

    const result = await useCase.execute({
      email: 'test@example.com',
      password: '123456',
    });

    expect(tokenService.sign).toHaveBeenCalled();
    expect(result).toEqual({ message: 'Login exitoso', token: 'token' });
  });
});
