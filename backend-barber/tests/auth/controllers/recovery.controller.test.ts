import { createMockReq, createMockRes } from '../../test-utils/expressMocks';

jest.mock('../../../src/config/mailer', () => {
  const sendMail = jest.fn();
  return {
    __esModule: true,
    default: { sendMail },
    sendMail,
  };
});

jest.mock('../../../src/auth/services/passwordReset.services', () => ({
  __esModule: true,
  createResetToken: jest.fn(),
  verifyAndConsumeResetToken: jest.fn(),
  default: {
    createResetToken: jest.fn(),
    verifyAndConsumeResetToken: jest.fn(),
  },
}));

jest.mock('../../../src/auth/services/users.services', () => ({
  __esModule: true,
  findByEmail: jest.fn(),
  updatePassword: jest.fn(),
  default: {
    findByEmail: jest.fn(),
    updatePassword: jest.fn(),
  },
}));

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
  hash: jest.fn(),
}));

import bcrypt from 'bcrypt';
import mailer from '../../../src/config/mailer';
import { requestReset, resetPassword } from '../../../src/auth/controllers/recovery.controller';
import { createResetToken, verifyAndConsumeResetToken } from '../../../src/auth/services/passwordReset.services';
import { findByEmail, updatePassword } from '../../../src/auth/services/users.services';

describe('recovery.controller', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://frontend.example';
  });

  describe('requestReset', () => {
    it('si el usuario existe: genera token y envía email, responde 200 genérico', async () => {
      (findByEmail as jest.Mock).mockResolvedValue({ _id: 'u1', email: 'test@example.com' });
      (createResetToken as jest.Mock).mockResolvedValue('rawtoken');
      (mailer.sendMail as jest.Mock).mockResolvedValue(undefined);

      const req = createMockReq({ email: 'test@example.com' });
      const res = createMockRes() as any;

      await requestReset(req, res);

      expect(findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(createResetToken).toHaveBeenCalledWith('u1');
      expect(mailer.sendMail).toHaveBeenCalledTimes(1);

      const callArg = (mailer.sendMail as jest.Mock).mock.calls[0][0];
      expect(callArg.to).toBe('test@example.com');
      expect(callArg.subject).toBe('Restablece tu contraseña');
      expect(callArg.html).toContain('https://frontend.example/reset-password?token=rawtoken');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Si el email existe, recibirás instrucciones para restablecer la contraseña.',
      });
    });

    it('si el usuario NO existe: responde 200 genérico y NO envía email', async () => {
      (findByEmail as jest.Mock).mockResolvedValue(null);

      const req = createMockReq({ email: 'missing@example.com' });
      const res = createMockRes() as any;

      await requestReset(req, res);

      expect(findByEmail).toHaveBeenCalledWith('missing@example.com');
      expect(createResetToken).not.toHaveBeenCalled();
      expect(mailer.sendMail).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Si el email existe, recibirás instrucciones para restablecer la contraseña.',
      });
    });
  });

  describe('resetPassword', () => {
    it('token inválido/expirado: responde 400 y no actualiza password', async () => {
      (verifyAndConsumeResetToken as jest.Mock).mockResolvedValue(null);

      const req = createMockReq({ token: 'bad', password: '123456' });
      const res = createMockRes() as any;

      await resetPassword(req, res);

      expect(verifyAndConsumeResetToken).toHaveBeenCalledWith('bad');
      expect(updatePassword).not.toHaveBeenCalled();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
    });

    it('exitoso: consume token atómicamente, hashea password y actualiza, responde 200', async () => {
      (verifyAndConsumeResetToken as jest.Mock).mockResolvedValue({ _id: 'doc1', userId: 'u1' });
      (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hash123');
      (updatePassword as jest.Mock).mockResolvedValue(undefined);

      const req = createMockReq({ token: 'good', password: '123456' });
      const res = createMockRes() as any;

      await resetPassword(req, res);

      expect(verifyAndConsumeResetToken).toHaveBeenCalledWith('good');
      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
      expect(updatePassword).toHaveBeenCalledWith('u1', 'hash123');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Contraseña restablecida con éxito' });
    });
  });
});
