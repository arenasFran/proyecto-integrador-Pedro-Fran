import { AuthController } from '../../../../src/interface-adapters/controllers/auth/AuthController';
import { RegisterUserUseCase } from '../../../../src/application/use-cases/auth/RegisterUserUseCase';
import { LoginUserUseCase } from '../../../../src/application/use-cases/auth/LoginUserUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('AuthController', () => {
  let registerUser: jest.Mocked<RegisterUserUseCase>;
  let loginUser: jest.Mocked<LoginUserUseCase>;
  let controller: AuthController;

  beforeEach(() => {
    registerUser = { execute: jest.fn() } as unknown as jest.Mocked<RegisterUserUseCase>;
    loginUser = { execute: jest.fn() } as unknown as jest.Mocked<LoginUserUseCase>;
    controller = new AuthController(registerUser, loginUser);
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

  it('debe loguear usuario y responder 200', async () => {
    loginUser.execute.mockResolvedValue({ message: 'ok', token: 'token' });
    const req = createMockReq({ email: 'test@example.com', password: '123456' });
    const res = createMockRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok', token: 'token' });
  });

  it('debe manejar error en login', async () => {
    loginUser.execute.mockRejectedValue(new Error('boom'));
    const req = createMockReq({ email: 'test@example.com', password: '123456' });
    const res = createMockRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor.' });
  });
});
