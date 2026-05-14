import { register } from '../../../../src/modules/auth/controllers/auth.controller';
import {
    findBarberByPhone,
} from '../../../../src/modules/auth/services/barber.services';
import {
    createRegisteredClient,
    findRegisteredClientByPhone,
} from '../../../../src/modules/auth/services/client.services';
import {
    findUserByEmail,
    hashPassword,
} from '../../../../src/modules/auth/utils/auth.utils';
import { createMockReq, createMockRes } from '../../../test-utils/expressMocks';

jest.mock('../../../../src/modules/auth/utils/auth.utils', () => ({
  __esModule: true,
  findUserByEmail: jest.fn(),
  hashPassword: jest.fn(),
  validatePassword: jest.fn(),
}));

jest.mock('../../../../src/modules/auth/services/barber.services', () => ({
  __esModule: true,
  findBarberByPhone: jest.fn(),
}));

jest.mock('../../../../src/modules/auth/services/client.services', () => ({
  __esModule: true,
  findRegisteredClientByPhone: jest.fn(),
  createRegisteredClient: jest.fn(),
}));

describe('auth.controller – register', () => {
  const validBody = {
    email: 'test@example.com',
    password: 'secret123',
    name: 'Test',
    lastname: 'User',
    phone: '1234567890',
  };

  it('registro exitoso: hashea password, guarda usuario y responde 201', async () => {
    (hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    (findBarberByPhone as jest.Mock).mockResolvedValue(null);
    (findRegisteredClientByPhone as jest.Mock).mockResolvedValue(null);
    (createRegisteredClient as jest.Mock).mockResolvedValue(undefined);

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(hashPassword).toHaveBeenCalledWith('secret123');
    expect(createRegisteredClient).toHaveBeenCalledWith({
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
    (findBarberByPhone as jest.Mock).mockResolvedValue({ _id: 'b1' });
    (findRegisteredClientByPhone as jest.Mock).mockResolvedValue(null);

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Teléfono en uso.' });
  });

  it('error 11000 al guardar por condición de carrera: responde 409 con campo correspondiente', async () => {
    (hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    (findBarberByPhone as jest.Mock).mockResolvedValue(null);
    (findRegisteredClientByPhone as jest.Mock).mockResolvedValue(null);
    (createRegisteredClient as jest.Mock).mockRejectedValue({ code: 11000, keyValue: { phone: '1234567890' } });

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Teléfono en uso.' });
  });

  it('error genérico de DB: responde 500', async () => {
    (hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
    (findUserByEmail as jest.Mock).mockResolvedValue(null);
    (findBarberByPhone as jest.Mock).mockResolvedValue(null);
    (findRegisteredClientByPhone as jest.Mock).mockResolvedValue(null);
    (createRegisteredClient as jest.Mock).mockRejectedValue(new Error('DB connection lost'));

    const req = createMockReq(validBody);
    const res = createMockRes() as any;

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al registrar al usuario' });
  });
});
