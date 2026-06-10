import { AuthController } from '../../../../src/interface-adapters/controllers/auth/AuthController';
import { RegisterUserUseCase } from '../../../../src/application/use-cases/auth/RegisterUserUseCase';
import { RefreshTokenUseCase } from '../../../../src/application/use-cases/auth/RefreshTokenUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('AuthController', () => {
  let registerUser: jest.Mocked<RegisterUserUseCase>;
  let refreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;
  let controller: AuthController;

  beforeEach(() => {
    registerUser = { execute: jest.fn() } as unknown as jest.Mocked<RegisterUserUseCase>;
    refreshTokenUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RefreshTokenUseCase>;
    controller = new AuthController(registerUser, refreshTokenUseCase);
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
});
