import { AuthGoogleController } from '../../../../src/interface-adapters/controllers/auth/AuthGoogleController';
import { AuthenticateWithGoogleUseCase } from '../../../../src/application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('AuthGoogleController', () => {
  let authenticateWithGoogle: jest.Mocked<AuthenticateWithGoogleUseCase>;
  let controller: AuthGoogleController;

  beforeEach(() => {
    authenticateWithGoogle = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AuthenticateWithGoogleUseCase>;

    controller = new AuthGoogleController(authenticateWithGoogle);
  });

  it('debe autenticar con Google', async () => {
    authenticateWithGoogle.execute.mockResolvedValue({ message: 'ok', token: 'token' });
    const req = createMockReq({ token: 'google-token' });
    const res = createMockRes();

    await controller.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok', token: 'token' });
  });

  it('debe manejar error al autenticar con Google', async () => {
    authenticateWithGoogle.execute.mockRejectedValue(new AppError('fail', 401));
    const req = createMockReq({ token: 'google-token' });
    const res = createMockRes();

    await controller.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
  });
});
