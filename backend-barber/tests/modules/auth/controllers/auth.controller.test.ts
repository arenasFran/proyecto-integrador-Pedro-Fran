import { AuthController } from '../../../../src/interface-adapters/controllers/auth/AuthController';
import { RegisterUserUseCase } from '../../../../src/application/use-cases/auth/RegisterUserUseCase';
import { RefreshTokenUseCase } from '../../../../src/application/use-cases/auth/RefreshTokenUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';
import { makeMockRefreshTokenRepository, makeMockHashService } from '../../../test-utils/mocks';

describe('AuthController', () => {
  let registerUser: jest.Mocked<RegisterUserUseCase>;
  let refreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;
  let refreshTokenRepository: ReturnType<typeof makeMockRefreshTokenRepository>;
  let hashService: ReturnType<typeof makeMockHashService>;
  let controller: AuthController;

  beforeEach(() => {
    registerUser = { execute: jest.fn() } as unknown as jest.Mocked<RegisterUserUseCase>;
    refreshTokenUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RefreshTokenUseCase>;
    refreshTokenRepository = makeMockRefreshTokenRepository();
    hashService = makeMockHashService();
    controller = new AuthController(registerUser, refreshTokenUseCase, refreshTokenRepository as any, hashService);
  });

  it('debe registrar usuario y responder 201', async () => {
    registerUser.execute.mockResolvedValue({ message: 'ok' });
    const req = createMockReq({ email: 'test@example.com' });
    const res = createMockRes();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
  });

  it('debe manejar error en registro', async () => {
    registerUser.execute.mockRejectedValue(new AppError('fail', 409));
    const req = createMockReq({ email: 'test@example.com' });
    const res = createMockRes();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
  });

  it('debe refrescar token', async () => {
    refreshTokenUseCase.execute.mockResolvedValue({
      message: 'Token renovado',
      token: 'new-access',
      refreshToken: 'new-refresh',
    });
    const req = createMockReq({ refreshToken: 'valid-refresh' });
    const res = createMockRes();

    await controller.refresh(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Token renovado',
      token: 'new-access',
      refreshToken: 'new-refresh',
    });
  });

  describe('logout', () => {
    it('debe revocar el refresh token en la base cuando viene en el body', async () => {
      hashService.sha256.mockReturnValue('hashed-token');
      const req = createMockReq({ refreshToken: 'raw-refresh-token' });
      const res = createMockRes();

      await controller.logout(req, res);

      expect(hashService.sha256).toHaveBeenCalledWith('raw-refresh-token');
      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('hashed-token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Sesión cerrada exitosamente' });
    });

    it('debe revocar el refresh token cuando viene solo en la cookie', async () => {
      hashService.sha256.mockReturnValue('hashed-from-cookie');
      const req = {
        body: {},
        headers: { cookie: 'refreshToken=raw-from-cookie; other=1' },
      } as unknown as Parameters<typeof controller.logout>[0];
      const res = createMockRes();

      await controller.logout(req, res);

      expect(hashService.sha256).toHaveBeenCalledWith('raw-from-cookie');
      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith('hashed-from-cookie');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('no debe fallar ni llamar revoke si no hay ningún token', async () => {
      const req = { body: {}, headers: {} } as unknown as Parameters<typeof controller.logout>[0];
      const res = createMockRes();

      await controller.logout(req, res);

      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Sesión cerrada exitosamente' });
    });
  });
});
