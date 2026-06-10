import { AuthenticateWithGoogleUseCase } from '../../../../src/application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { IRefreshTokenRepository } from '../../../../src/domain/repositories/IRefreshTokenRepository';
import { IUserRepository } from '../../../../src/domain/repositories/IUserRepository';
import { IGoogleAuthService } from '../../../../src/application/ports/IGoogleAuthService';
import { IPasswordHasher } from '../../../../src/application/ports/IPasswordHasher';
import { ITokenService } from '../../../../src/application/ports/ITokenService';
import { IHashService } from '../../../../src/application/ports/IHashService';
import { IDateTimeProvider } from '../../../../src/application/ports/IDateTimeProvider';
import { User, UserProps } from '../../../../src/domain/entities/User';

describe('AuthenticateWithGoogleUseCase', () => {
  const now = new Date('2024-01-01T10:00:00.000Z');

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
  let refreshTokenRepository: jest.Mocked<IRefreshTokenRepository>;
  let hashService: jest.Mocked<IHashService>;
  let dateTimeProvider: jest.Mocked<IDateTimeProvider>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let useCase: AuthenticateWithGoogleUseCase;

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

    googleAuthService = {
      verifyIdToken: jest.fn(),
    };

    tokenService = {
      sign: jest.fn(),
      verify: jest.fn(),
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      signPartialToken: jest.fn(),
      verifyPartialToken: jest.fn(),
    };

    refreshTokenRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      revokeAllByUserId: jest.fn(),
    };

    hashService = {
      sha256: jest.fn(),
      constantTimeEqual: jest.fn(),
    };

    dateTimeProvider = {
      now: jest.fn(),
    };

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn(),
    };

    useCase = new AuthenticateWithGoogleUseCase(
      userRepository,
      googleAuthService,
      tokenService,
      refreshTokenRepository,
      hashService,
      dateTimeProvider,
      passwordHasher
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

  it('debe fallar si la cuenta es local sin Google vinculado', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-1',
    });
    userRepository.findByEmail.mockResolvedValue(
      makeUser({ authProvider: 'local', googleId: undefined })
    );

    await expect(useCase.execute({ token: 'ok' })).rejects.toBeInstanceOf(AppError);
  });

  it('debe retornar token si el usuario ya existe con Google', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      name: 'Juan Perez',
      sub: 'google-1',
    });
    userRepository.findByEmail.mockResolvedValue(makeUser());
    tokenService.signAccessToken.mockReturnValue('token');
    tokenService.signRefreshToken.mockReturnValue('refresh-token');
    hashService.sha256.mockReturnValue('hash');
    dateTimeProvider.now.mockReturnValue(now);

    const result = await useCase.execute({ token: 'ok' });

    expect(userRepository.createRegisteredClient).not.toHaveBeenCalled();
    expect(userRepository.updateLastLogin).toHaveBeenCalled();
    expect(result).toEqual({
      message: 'Login exitoso',
      token: 'token',
      refreshToken: 'refresh-token',
    });
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
    tokenService.signAccessToken.mockReturnValue('token');
    tokenService.signRefreshToken.mockReturnValue('refresh-token');
    hashService.sha256.mockReturnValue('hash');
    dateTimeProvider.now.mockReturnValue(now);

    const result = await useCase.execute({ token: 'ok' }) as { message: string; token: string; refreshToken: string };

    expect(userRepository.createRegisteredClient).toHaveBeenCalled();
    expect(userRepository.updateLastLogin).toHaveBeenCalled();
    expect(result.token).toBe('token');
    expect(result.refreshToken).toBe('refresh-token');
  });
});
