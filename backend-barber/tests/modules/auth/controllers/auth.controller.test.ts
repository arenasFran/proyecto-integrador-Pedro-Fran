import { AuthController } from '../../../../src/interface-adapters/controllers/auth/AuthController';
import { RegisterUserUseCase } from '../../../../src/application/use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase, LoginUserResult } from '../../../../src/application/use-cases/auth/LoginUserUseCase';
import { RefreshTokenUseCase } from '../../../../src/application/use-cases/auth/RefreshTokenUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('AuthController', () => {
  let registerUser: jest.Mocked<RegisterUserUseCase>;
  let loginUser: jest.Mocked<LoginUserUseCase>;
  let refreshTokenUseCase: jest.Mocked<RefreshTokenUseCase>;
  let controller: AuthController;

  beforeEach(() => {
    registerUser = { execute: jest.fn() } as unknown as jest.Mocked<RegisterUserUseCase>;
    loginUser = { execute: jest.fn() } as unknown as jest.Mocked<LoginUserUseCase>;
    refreshTokenUseCase = { execute: jest.fn() } as unknown as jest.Mocked<RefreshTokenUseCase>;
    controller = new AuthController(registerUser, loginUser, refreshTokenUseCase);
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

  it('debe responder requiresTwoFactor en login exitoso', async () => {
    loginUser.execute.mockResolvedValue({ requiresTwoFactor: true } as LoginUserResult);
    const req = createMockReq({ email: 'test@example.com', password: '123456' });
    const res = createMockRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ requiresTwoFactor: true });
  });

  it('debe manejar error en login', async () => {
    loginUser.execute.mockRejectedValue(new Error('boom'));
    const req = createMockReq({ email: 'test@example.com', password: '123456' });
    const res = createMockRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor.' });
  });

  it('debe refrescar token', async () => {
    refreshTokenUseCase.execute.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    const req = createMockReq({ refreshToken: 'valid-refresh' });
    const res = createMockRes();

    await controller.refresh(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });
});
