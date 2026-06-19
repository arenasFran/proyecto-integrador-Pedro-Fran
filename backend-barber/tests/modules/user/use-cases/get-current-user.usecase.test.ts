import { GetCurrentUserUseCase } from '../../../../src/application/use-cases/user/GetCurrentUserUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { User, UserProps } from '../../../../src/domain/entities/User';

describe('GetCurrentUserUseCase', () => {
  const makeUser = (overrides?: Partial<UserProps>) => {
    const base: UserProps = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Juan',
      lastname: 'Perez',
      kind: 'Registrado',
      authProvider: 'local',
      passwordHash: 'hash',
    };
    return User.create({ ...base, ...overrides });
  };

  let userRepository: jest.Mocked<IUserRepository>;
  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
      update: jest.fn(),
    updatePassword: jest.fn(),
      updateTwoFactor: jest.fn(),
      updateLastLogin: jest.fn(),
      updateUserSecurity: jest.fn(),
    };

    useCase = new GetCurrentUserUseCase(userRepository);
  });

  it('debe retornar el usuario cuando existe', async () => {
    const user = makeUser();
    userRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute('user-1');

    expect(result).toBe(user);
    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
  });

  it('debe lanzar AppError cuando el usuario no existe', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('user-inexistente')).rejects.toThrow(AppError);
    await expect(useCase.execute('user-inexistente')).rejects.toMatchObject({
      message: 'Usuario no encontrado.',
      statusCode: 404,
    });
  });
});
