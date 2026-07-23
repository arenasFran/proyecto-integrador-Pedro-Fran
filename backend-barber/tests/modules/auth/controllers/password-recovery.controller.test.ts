import { PasswordRecoveryController } from '../../../../src/interface-adapters/controllers/auth/PasswordRecoveryController';
import { RequestPasswordResetUseCase } from '../../../../src/application/use-cases/password/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../../../../src/application/use-cases/password/ResetPasswordUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('PasswordRecoveryController', () => {
  let requestPasswordReset: jest.Mocked<RequestPasswordResetUseCase>;
  let resetPassword: jest.Mocked<ResetPasswordUseCase>;
  let controller: PasswordRecoveryController;

  beforeEach(() => {
    requestPasswordReset = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RequestPasswordResetUseCase>;

    resetPassword = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ResetPasswordUseCase>;

    controller = new PasswordRecoveryController(requestPasswordReset, resetPassword);
  });

  it('debe solicitar reset de password', async () => {
    requestPasswordReset.execute.mockResolvedValue({ message: 'ok' });
    const req = createMockReq({ email: 'test@example.com' });
    const res = createMockRes();

    await controller.requestReset(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
  });

  it('debe manejar error en request reset', async () => {
    requestPasswordReset.execute.mockRejectedValue(new AppError('fail', 400));
    const req = createMockReq({ email: 'test@example.com' });
    const res = createMockRes();

    await controller.requestReset(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
  });

  it('debe resetear password', async () => {
    resetPassword.execute.mockResolvedValue({ message: 'ok' });
    const req = createMockReq({ token: 'token', password: '123456', repeatPassword: '123456' });
    const res = createMockRes();

    await controller.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
  });

  it('debe manejar error en reset password', async () => {
    resetPassword.execute.mockRejectedValue(new Error('boom'));
    const req = createMockReq({ token: 'token', password: '123456', repeatPassword: '123456' });
    const res = createMockRes();

    await controller.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: expect.any(String) });
  });
});
