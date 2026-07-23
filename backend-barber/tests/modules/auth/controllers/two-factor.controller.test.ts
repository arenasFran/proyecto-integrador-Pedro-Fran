import { TwoFactorController } from '../../../../src/interface-adapters/controllers/auth/TwoFactorController';
import { SendTwoFactorCodeUseCase } from '../../../../src/application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../../../../src/application/use-cases/auth/VerifyTwoFactorUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

describe('TwoFactorController', () => {
  let sendTwoFactor: jest.Mocked<SendTwoFactorCodeUseCase>;
  let verifyTwoFactor: jest.Mocked<VerifyTwoFactorUseCase>;
  let controller: TwoFactorController;

  beforeEach(() => {
    sendTwoFactor = { execute: jest.fn() } as unknown as jest.Mocked<SendTwoFactorCodeUseCase>;
    verifyTwoFactor = { execute: jest.fn() } as unknown as jest.Mocked<VerifyTwoFactorUseCase>;
    controller = new TwoFactorController(sendTwoFactor, verifyTwoFactor);
  });

  it('debe enviar codigo 2FA', async () => {
    sendTwoFactor.execute.mockResolvedValue({ message: 'ok' });
    const req = createMockReq({ email: 'test@example.com', password: '123456' });
    const res = createMockRes();

    await controller.sendTwoFactorCode(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok' });
  });

  it('debe manejar error al enviar codigo 2FA', async () => {
    sendTwoFactor.execute.mockRejectedValue(new AppError('fail', 401));
    const req = createMockReq({ email: 'test@example.com', password: '123456' });
    const res = createMockRes();

    await controller.sendTwoFactorCode(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'fail' });
  });

  it('debe verificar codigo 2FA', async () => {
    verifyTwoFactor.execute.mockResolvedValue({ message: 'ok', token: 'token', refreshToken: 'refresh-token' });
    const req = createMockReq({ email: 'test@example.com', code: '123456' });
    const res = createMockRes();

    await controller.verifyTwoFactorCode(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'ok', token: 'token', refreshToken: 'refresh-token' });
  });

  it('debe manejar error al verificar codigo 2FA', async () => {
    verifyTwoFactor.execute.mockRejectedValue(new Error('boom'));
    const req = createMockReq({ email: 'test@example.com', code: '123456' });
    const res = createMockRes();

    await controller.verifyTwoFactorCode(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error interno del servidor.' });
  });
});
