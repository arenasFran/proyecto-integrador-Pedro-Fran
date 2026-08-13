import { CompleteGoogleProfileUseCase } from '../../../../src/application/use-cases/auth/CompleteGoogleProfileUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockUserRepository, makeMockTokenService, makeMockHashService, makeMockRefreshTokenRepository } from '../../../test-utils/mocks';

describe('CompleteGoogleProfileUseCase', () => {
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let tokenService: ReturnType<typeof makeMockTokenService>;
  let hashService: ReturnType<typeof makeMockHashService>;
  let refreshTokenRepository: ReturnType<typeof makeMockRefreshTokenRepository>;
  let useCase: CompleteGoogleProfileUseCase;

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    tokenService = makeMockTokenService();
    hashService = makeMockHashService();
    refreshTokenRepository = makeMockRefreshTokenRepository();
    useCase = new CompleteGoogleProfileUseCase(userRepository as any, tokenService as any, hashService as any, refreshTokenRepository as any);

    tokenService.verifyPartialToken.mockReturnValue({ email: 'nuevo@test.com', googleId: 'google-123' });
    userRepository.findByEmail.mockResolvedValue(null);
    userRepository.createRegisteredClient.mockImplementation(async (user: any) => ({
      id: 'user-1',
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      phone: user.phone,
      kind: user.kind,
    }));
    tokenService.signAccessToken.mockReturnValue('access-token');
    tokenService.signRefreshToken.mockReturnValue('refresh-token');
    hashService.sha256.mockReturnValue('hash-refresh');
  });

  it('debe lanzar 401 si el partialToken es inválido o expiró', async () => {
    tokenService.verifyPartialToken.mockImplementation(() => { throw new Error('expired'); });

    await expect(
      useCase.execute({ partialToken: 'bad', name: 'Juan', phone: '099111222' }),
    ).rejects.toThrow(AppError);
  });

  it('debe lanzar 409 si el usuario ya existe', async () => {
    userRepository.findByEmail.mockResolvedValue({ id: 'existing' } as any);

    await expect(
      useCase.execute({ partialToken: 'ok', name: 'Juan', phone: '099111222' }),
    ).rejects.toThrow(/ya existe/);
  });

  it('debe lanzar 400 si el nombre está vacío', async () => {
    await expect(
      useCase.execute({ partialToken: 'ok', name: '   ', phone: '099111222' }),
    ).rejects.toThrow(/nombre es obligatorio/);
  });

  it('debe lanzar error si el teléfono es inválido', async () => {
    await expect(
      useCase.execute({ partialToken: 'ok', name: 'Juan', phone: 'abc' }),
    ).rejects.toThrow(/Teléfono inválido/);
  });

  it('debe crear el usuario, firmar tokens y guardar el refresh token', async () => {
    const result = await useCase.execute({ partialToken: 'ok', name: 'Juan', lastname: 'Perez', phone: '099111222' });

    expect(userRepository.createRegisteredClient).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'nuevo@test.com', name: 'Juan', lastname: 'Perez', authProvider: 'google' }),
    );
    expect(refreshTokenRepository.create).toHaveBeenCalledWith('hash-refresh', 'user-1', expect.any(Date));
    expect(userRepository.updateLastLogin).toHaveBeenCalledWith('user-1');
    expect(result).toMatchObject({
      message: 'Perfil completado exitosamente',
      token: 'access-token',
      refreshToken: 'refresh-token',
      user: expect.objectContaining({ id: 'user-1', name: 'Juan', photoUrl: null }),
    });
  });

  it('debe usar lastname vacío si no se provee', async () => {
    await useCase.execute({ partialToken: 'ok', name: 'Juan', phone: '099111222' });

    expect(userRepository.createRegisteredClient).toHaveBeenCalledWith(
      expect.objectContaining({ lastname: '' }),
    );
  });
});
