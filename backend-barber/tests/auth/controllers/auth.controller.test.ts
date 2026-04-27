import { createMockReq, createMockRes } from '../../test-utils/expressMocks';

jest.mock('../../../src/auth/services/users.services', () => ({
  __esModule: true,
  saveUserService: jest.fn(),
  default: {
    saveUserService: jest.fn(),
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
import { register } from '../../../src/auth/controllers/auth.controller';
import { saveUserService } from '../../../src/auth/services/users.services';

describe('auth.controller – register', () => {
  const validBody = {
    email: 'test@example.com',
    password: 'secret123',
    name: 'Test',
    lastname: 'User',
    phone: '1234567890',
  };

  it('registro exitoso: hashea password, guarda usuario y responde 201', async () => {
    (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashedPassword');
    (saveUserService as jest.Mock).mockResolvedValue(undefined);

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
    expect(saveUserService).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test',
      lastname: 'User',
      phone: '1234567890',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario registrado con éxito' });
  });

  it('email duplicado (error 11000 keyValue.email): responde 409 con mensaje de email en uso', async () => {
    (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashedPassword');
    const mongoError = { code: 11000, keyValue: { email: 'test@example.com' } };
    (saveUserService as jest.Mock).mockRejectedValue(mongoError);

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email en uso.' });
  });

  it('teléfono duplicado (error 11000 keyValue.phone): responde 409 con mensaje de teléfono en uso', async () => {
    (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashedPassword');
    const mongoError = { code: 11000, keyValue: { phone: '1234567890' } };
    (saveUserService as jest.Mock).mockRejectedValue(mongoError);

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Teléfono en uso.' });
  });

  it('error genérico de DB: responde 500', async () => {
    (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashedPassword');
    (saveUserService as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al registrar al usuario' });
  });
});
