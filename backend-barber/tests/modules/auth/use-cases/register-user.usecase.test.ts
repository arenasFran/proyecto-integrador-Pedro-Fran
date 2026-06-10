import { RegisterUserUseCase } from '../../../../src/application/use-cases/auth/RegisterUserUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { User, UserProps } from '../../../../src/domain/entities/User';

describe('RegisterUserUseCase', () => {
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
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
      updatePassword: jest.fn(),
      updateTwoFactor: jest.fn(),
      updateLastLogin: jest.fn(),
      updateUserSecurity: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    useCase = new RegisterUserUseCase(userRepository, passwordHasher);
  });

  it('debe fallar si las contrasenas no coinciden', async () => {
    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'Abcd1234',
        repeatPassword: '1234Abcd',
        name: 'Juan',
        lastname: 'Perez',
        phone: '123456789',
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el email ya esta en uso', async () => {
    userRepository.findByEmail.mockResolvedValue(makeUser());

    await expect(
      useCase.execute({
        email: 'test@example.com',
        password: 'Abcd1234',
        repeatPassword: 'Abcd1234',
        name: 'Juan',
        lastname: 'Perez',
        phone: '123456789',
      })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el telefono ya esta en uso', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByPhone.mockResolvedValue(makeUser({ phone: '123456789' }));

    await expect(
      useCase.execute({
      email: 'nuevo@example.com',
      password: 'Abcd1234',
      repeatPassword: 'Abcd1234',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
    })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('debe registrar un usuario con hash de password', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.findByPhone.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed');
    userRepository.createRegisteredClient.mockResolvedValue(makeUser());

    const result = await useCase.execute({
      email: 'nuevo@example.com',
      password: 'Abcd1234',
      repeatPassword: 'Abcd1234',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('Abcd1234');
    expect(userRepository.createRegisteredClient).toHaveBeenCalled();
    expect(result.message).toMatch(/Usuario registrado/);
  });
});
