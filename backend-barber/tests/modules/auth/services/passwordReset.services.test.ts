import crypto from 'crypto';

jest.mock('../../../../src/modules/auth/models/passwordReset.model', () => {
  const save = jest.fn().mockResolvedValue(undefined);
  const PasswordReset = jest.fn().mockImplementation((doc) => ({ ...doc, save }));

  (PasswordReset as any).findOne = jest.fn();
  (PasswordReset as any).findByIdAndUpdate = jest.fn();
  (PasswordReset as any).findOneAndUpdate = jest.fn();

  return {
    __esModule: true,
    default: PasswordReset,
  };
});

import PasswordReset from '../../../../src/modules/auth/models/passwordReset.model';
import { consumeResetToken, createResetToken, verifyAndConsumeResetToken, verifyResetToken } from '../../../../src/modules/auth/services/passwordReset.services';

describe('passwordReset.services', () => {
  beforeEach(() => {
    delete process.env.RESET_TOKEN_EXPIRATION_MIN;
  });

  it('createResetToken: devuelve token raw y guarda tokenHash + expiresAt futuro', async () => {
    const randomBytesSpy = jest
      .spyOn(crypto, 'randomBytes')
      .mockReturnValue(Buffer.from('0'.repeat(64), 'hex') as any);

    const update = jest.fn().mockReturnThis();
    const digest = jest.fn().mockReturnValue('fixedhash');
    const createHashSpy = jest.spyOn(crypto, 'createHash').mockReturnValue({ update, digest } as any);

    const now = Date.now();
    const token = await createResetToken('user1');

    expect(token).toBe('0'.repeat(64));
    expect('fixedhash').not.toBe(token);

    expect(PasswordReset).toHaveBeenCalledTimes(1);
    const arg = (PasswordReset as unknown as jest.Mock).mock.calls[0][0];
    expect(arg).toEqual(
      expect.objectContaining({
        userId: 'user1',
        tokenHash: 'fixedhash',
        expiresAt: expect.any(Date),
      })
    );
    expect((arg.expiresAt as Date).getTime()).toBeGreaterThan(now);

    const instance = (PasswordReset as unknown as jest.Mock).mock.results[0].value;
    expect(instance.save).toHaveBeenCalledTimes(1);

    expect(randomBytesSpy).toHaveBeenCalledWith(32);
    expect(createHashSpy).toHaveBeenCalledWith('sha256');
  });

  it('verifyResetToken: consulta por hash y validez (used=false, expiresAt > now)', async () => {
    const update = jest.fn().mockReturnThis();
    const digest = jest.fn().mockReturnValue('fixedhash');
    jest.spyOn(crypto, 'createHash').mockReturnValue({ update, digest } as any);

    (PasswordReset as any).findOne.mockResolvedValue({ _id: 'doc' });

    const doc = await verifyResetToken('raw');

    expect(doc).toEqual({ _id: 'doc' });
    expect((PasswordReset as any).findOne).toHaveBeenCalledTimes(1);

    const query = (PasswordReset as any).findOne.mock.calls[0][0];
    expect(query).toEqual(
      expect.objectContaining({
        tokenHash: 'fixedhash',
        used: false,
        expiresAt: expect.objectContaining({ $gt: expect.any(Date) }),
      })
    );
  });

  it('consumeResetToken: marca used=true', async () => {
    (PasswordReset as any).findByIdAndUpdate.mockResolvedValue(undefined);

    await consumeResetToken('id1');

    expect((PasswordReset as any).findByIdAndUpdate).toHaveBeenCalledWith('id1', { used: true });
  });

  it('verifyAndConsumeResetToken: atómicamente marca used=true y retorna el doc previo cuando el token es válido', async () => {
    const update = jest.fn().mockReturnThis();
    const digest = jest.fn().mockReturnValue('fixedhash');
    jest.spyOn(crypto, 'createHash').mockReturnValue({ update, digest } as any);

    const mockDoc = { _id: 'doc1', userId: 'u1', used: false };
    (PasswordReset as any).findOneAndUpdate.mockResolvedValue(mockDoc);

    const result = await verifyAndConsumeResetToken('rawtoken');

    expect(result).toEqual(mockDoc);
    expect((PasswordReset as any).findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ tokenHash: 'fixedhash', used: false }),
      { $set: { used: true } },
      { new: false },
    );
  });

  it('verifyAndConsumeResetToken: retorna null cuando el token no existe, está usado o expirado', async () => {
    jest.spyOn(crypto, 'createHash').mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('somehash'),
    } as any);

    (PasswordReset as any).findOneAndUpdate.mockResolvedValue(null);

    const result = await verifyAndConsumeResetToken('invalid');

    expect(result).toBeNull();
  });
});
