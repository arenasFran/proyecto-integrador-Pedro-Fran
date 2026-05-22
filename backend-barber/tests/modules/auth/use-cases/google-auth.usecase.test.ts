import { AuthenticateWithGoogleUseCase } from '../../../../src/application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { IGoogleAuthService } from '../../../../src/application/ports/IGoogleAuthService';
import { ITokenService } from '../../../../src/application/ports/ITokenService';
import { User, UserProps } from '../../../../src/domain/entities/User';

describe('AuthenticateWithGoogleUseCase', () => {
  const makeUser = (overrides?: Partial<UserProps>) => {
    const user = User.create({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Juan',
      lastname: 'Perez',
      phone: '123456789',
      kind: 'Registrado',
      authProvider: 'google',
      googleId: 'google-1',
    });

    return overrides ? User.create({ ...user.toPrimitives(), ...overrides }) : user;
  };

  let userRepository: jest.Mocked<IUserRepository>;
  let googleAuthService: jest.Mocked<IGoogleAuthService>;
  let tokenService: jest.Mocked<ITokenService>;
  let useCase: AuthenticateWithGoogleUseCase;

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      createRegisteredClient: jest.fn(),
      updatePassword: jest.fn(),
      updateTwoFactor: jest.fn(),
    };

    googleAuthService = {
      verifyIdToken: jest.fn(),
    };

    tokenService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    useCase = new AuthenticateWithGoogleUseCase(
      userRepository,
      googleAuthService,
      tokenService
    );
  });

  it('debe fallar si el token de Google es invalido', async () => {
    googleAuthService.verifyIdToken.mockRejectedValue(new Error('invalid'));

    await expect(useCase.execute({ token: 'bad' })).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si la cuenta no esta verificada', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: false,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-1',
    });

    await expect(useCase.execute({ token: 'ok' })).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el usuario no puede iniciar con Google', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-1',
    });
    userRepository.findByEmail.mockResolvedValue(makeUser({ kind: 'Admin' }));

    await expect(useCase.execute({ token: 'ok' })).rejects.toBeInstanceOf(AppError);
  });

  it('debe fallar si el googleId no coincide', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-2',
    });
    userRepository.findByEmail.mockResolvedValue(makeUser({ googleId: 'google-1' }));

    await expect(useCase.execute({ token: 'ok' })).rejects.toBeInstanceOf(AppError);
  });

  it('debe retornar token si el usuario ya existe', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-1',
    });
    userRepository.findByEmail.mockResolvedValue(makeUser());
    tokenService.sign.mockReturnValue('token');

    const result = await useCase.execute({ token: 'ok' });

    expect(userRepository.createRegisteredClient).not.toHaveBeenCalled();
    expect(result.token).toBe('token');
  });

  it('debe crear usuario si no existe', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-1',
    });
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.createRegisteredClient.mockResolvedValue(makeUser());
    tokenService.sign.mockReturnValue('token');

    const result = await useCase.execute({ token: 'ok' });

    expect(userRepository.createRegisteredClient).toHaveBeenCalled();
    expect(result.token).toBe('token');
  });
});
