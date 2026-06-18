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
import { makeMockUserRepository, makeMockTokenService, makeMockGoogleAuthService, makeMockRefreshTokenRepository, makeMockHashService, makeMockDateTimeProvider, makeMockPasswordHasher } from '../../../test-utils/mocks';

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
    userRepository = makeMockUserRepository();
    googleAuthService = makeMockGoogleAuthService();
    tokenService = makeMockTokenService();
    refreshTokenRepository = makeMockRefreshTokenRepository();
    hashService = makeMockHashService();
    dateTimeProvider = makeMockDateTimeProvider();
    passwordHasher = makeMockPasswordHasher();
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
    expect(userRepository.updateLastLogin).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({
      message: 'Login exitoso',
      token: 'token',
      refreshToken: 'refresh-token',
    });
  });

  it('debe requerir completar perfil sin nombre si Google no lo provee', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: true,
      sub: 'google-1',
    });
    userRepository.findByEmail.mockResolvedValue(null);
    tokenService.signPartialToken.mockReturnValue('partial-token');

    const result = await useCase.execute({ token: 'ok' }) as { requiresProfileCompletion: true; partialToken: string; name?: string; lastname?: string };

    expect(userRepository.createRegisteredClient).not.toHaveBeenCalled();
    expect(result.requiresProfileCompletion).toBe(true);
    expect(result.partialToken).toBe('partial-token');
    expect(result.name).toBeUndefined();
    expect(result.lastname).toBeUndefined();
  });

  it('debe requerir completar perfil si el usuario no existe', async () => {
    googleAuthService.verifyIdToken.mockResolvedValue({
      email: 'test@example.com',
      emailVerified: true,
      givenName: 'Juan',
      familyName: 'Perez',
      sub: 'google-1',
    });
    userRepository.findByEmail.mockResolvedValue(null);
    tokenService.signPartialToken.mockReturnValue('partial-token');

    const result = await useCase.execute({ token: 'ok' }) as { requiresProfileCompletion: true; partialToken: string; name?: string; lastname?: string };

    expect(userRepository.createRegisteredClient).not.toHaveBeenCalled();
    expect(result.requiresProfileCompletion).toBe(true);
    expect(result.partialToken).toBe('partial-token');
    expect(result.name).toBe('Juan');
    expect(result.lastname).toBe('Perez');
  });
});
