import { createMockReq, createMockRes } from '../../test-utils/expressMocks';

jest.mock('../../../src/auth/services/users.services', () => ({
  __esModule: true,
  saveUserService: jest.fn(),
  findUserByEmail: jest.fn(),
  default: {
    saveUserService: jest.fn(),
    findUserByEmail: jest.fn(),
  },
}));

jest.mock('../../../src/auth/models/user.model', () => ({
  __esModule: true,
  Barber: { findOne: jest.fn() },
  RegisteredClient: { findOne: jest.fn() },
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
import { findUserByEmail, saveUserService } from '../../../src/auth/services/users.services';
import { Barber, RegisteredClient } from '../../../src/auth/models/user.model';

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
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    ((Barber as any).findOne as jest.Mock).mockResolvedValue(null);
    ((RegisteredClient as any).findOne as jest.Mock).mockResolvedValue(null);
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
      authProvider: 'local',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario registrado con éxito' });
  });

  it('email duplicado detectado en validación previa: responde 409', async () => {
    (findUserByEmail as jest.Mock).mockResolvedValue({ _id: 'u1' });

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email en uso.' });
  });

  it('teléfono duplicado detectado en validación previa: responde 409', async () => {
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    ((Barber as any).findOne as jest.Mock).mockResolvedValue({ _id: 'b1' });
    ((RegisteredClient as any).findOne as jest.Mock).mockResolvedValue(null);

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Teléfono en uso.' });
  });

  it('error 11000 al guardar por condición de carrera: responde 409 con campo correspondiente', async () => {
    (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashedPassword');
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    ((Barber as any).findOne as jest.Mock).mockResolvedValue(null);
    ((RegisteredClient as any).findOne as jest.Mock).mockResolvedValue(null);
    (saveUserService as jest.Mock).mockRejectedValue({ code: 11000, keyValue: { phone: '1234567890' } });

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Teléfono en uso.' });
  });

  it('error genérico de DB: responde 500', async () => {
    (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashedPassword');
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    ((Barber as any).findOne as jest.Mock).mockResolvedValue(null);
    ((RegisteredClient as any).findOne as jest.Mock).mockResolvedValue(null);
    (saveUserService as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al registrar al usuario' });
  });
});
