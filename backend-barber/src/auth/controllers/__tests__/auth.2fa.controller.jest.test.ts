import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { sendTwoFactorCode, verifyTwoFactorCode } from '../auth.2fa.controller';
import mailer from '../../../config/mailer';
import * as usersService from '../../services/users.services';
import { mockReq, mockRes } from '../../../test-utils/express';

jest.mock('../../../config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn() },
}));

jest.mock('../../services/users.services', () => ({
  __esModule: true,
  findUserByEmail: jest.fn(),
  validatePassword: jest.fn(),
}));

describe('auth.2fa.controller', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
  });

  describe('sendTwoFactorCode', () => {
    it('401 si el usuario no existe', async () => {
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue(null);

      const req = mockReq({ email: 'TEST@EXAMPLE.COM', password: 'x' });
      const res = mockRes();

      await sendTwoFactorCode(req, res);

      expect(usersService.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email y/o contraseña incorrectos.' });
    });

    it('401 si el usuario no tiene password (registrado con Google)', async () => {
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue({ password: undefined });

      const req = mockReq({ email: 'a@a.com', password: 'x' });
      const res = mockRes();

      await sendTwoFactorCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Este usuario se registró con Google, usá ese método para ingresar.',
      });
    });

    it('401 si password inválida', async () => {
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue({ password: 'hash' });
      (usersService.validatePassword as jest.Mock).mockResolvedValue(false);

      const req = mockReq({ email: 'a@a.com', password: 'bad' });
      const res = mockRes();

      await sendTwoFactorCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email y/o contraseña incorrectos.' });
    });

    it('200 y guarda el código y envía email', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const user: any = { password: 'hash', save };
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue(user);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(true);

      jest.spyOn(crypto, 'randomInt').mockReturnValue(123456 as any);
      (mailer as any).sendMail.mockResolvedValue(undefined);

      const req = mockReq({ email: 'Test@Example.com ', password: 'ok' });
      const res = mockRes();

      const before = Date.now();
      await sendTwoFactorCode(req, res);
      const after = Date.now();

      expect(user.twoFactorCode).toBe('123456');
      expect(user.twoFactorExpires).toBeInstanceOf(Date);
      const expMs = (user.twoFactorExpires as Date).getTime();
      expect(expMs).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
      expect(expMs).toBeLessThanOrEqual(after + 5 * 60 * 1000 + 50);
      expect(save).toHaveBeenCalled();

      expect(mailer.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Tu código de verificación',
        })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Código enviado al email' });
    });
  });

  describe('verifyTwoFactorCode', () => {
    it('401 si no hay usuario', async () => {
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue(null);

      const req = mockReq({ email: 'x@y.com', code: '000000' });
      const res = mockRes();

      await verifyTwoFactorCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado.' });
    });

    it('401 si no hay código activo', async () => {
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue({});

      const req = mockReq({ email: 'x@y.com', code: '000000' });
      const res = mockRes();

      await verifyTwoFactorCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'No hay código activo.' });
    });

    it('401 si el código expiró (y lo limpia)', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const user: any = {
        twoFactorCode: '123456',
        twoFactorExpires: new Date(Date.now() - 1000),
        save,
      };
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue(user);

      const req = mockReq({ email: 'x@y.com', code: '123456' });
      const res = mockRes();

      await verifyTwoFactorCode(req, res);

      expect(user.twoFactorCode).toBeUndefined();
      expect(user.twoFactorExpires).toBeUndefined();
      expect(save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'El código expiró.' });
    });

    it('401 si el código es incorrecto', async () => {
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue({
        twoFactorCode: '111111',
        twoFactorExpires: new Date(Date.now() + 60_000),
      });

      const req = mockReq({ email: 'x@y.com', code: '222222' });
      const res = mockRes();

      await verifyTwoFactorCode(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Código incorrecto.' });
    });

    it('200 si el código es correcto, lo limpia y devuelve JWT', async () => {
      const save = jest.fn().mockResolvedValue(undefined);
      const user: any = {
        _id: 'user-id',
        email: 'x@y.com',
        kind: 'Registrado',
        twoFactorCode: '123456',
        twoFactorExpires: new Date(Date.now() + 60_000),
        save,
      };
      (usersService.findUserByEmail as jest.Mock).mockResolvedValue(user);

      const signSpy = jest.spyOn(jwt, 'sign').mockReturnValue('jwt-token' as any);

      const req = mockReq({ email: 'X@Y.com', code: '123456' });
      const res = mockRes();

      await verifyTwoFactorCode(req, res);

      expect(user.twoFactorCode).toBeUndefined();
      expect(user.twoFactorExpires).toBeUndefined();
      expect(save).toHaveBeenCalled();
      expect(signSpy).toHaveBeenCalledWith(
        { id: 'user-id', email: 'x@y.com', kind: 'Registrado' },
        'test-secret',
        expect.objectContaining({ algorithm: 'HS256' })
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Login exitoso', token: 'jwt-token' });
    });
  });
});
