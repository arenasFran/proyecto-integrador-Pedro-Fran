import { Request, Response } from 'express';
import { UserController } from '../../../../src/interface-adapters/controllers/user/UserController';
import { GetCurrentUserUseCase } from '../../../../src/application/use-cases/user/GetCurrentUserUseCase';
import { AppError } from '../../../../src/application/errors/AppError';
import { User, UserProps } from '../../../../src/domain/entities/User';

describe('UserController', () => {
  const makeUser = (overrides?: Partial<UserProps>) => {
    const base: UserProps = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Juan',
      lastname: 'Perez',
      kind: 'Registrado',
      authProvider: 'local',
      passwordHash: 'hash',
    };
    return User.create({ ...base, ...overrides });
  };

  let getCurrentUser: jest.Mocked<GetCurrentUserUseCase>;
  let controller: UserController;

  beforeEach(() => {
    getCurrentUser = { execute: jest.fn() } as unknown as jest.Mocked<GetCurrentUserUseCase>;
    controller = new UserController(getCurrentUser);
  });

  it('debe retornar el perfil del usuario autenticado', async () => {
    const user = makeUser();
    getCurrentUser.execute.mockResolvedValue(user);

    const req = { user: { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' as const } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.getMe(req, res);

    expect(getCurrentUser.execute).toHaveBeenCalledWith('user-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 'user-1',
      name: 'Juan',
      lastname: 'Perez',
      email: 'user@example.com',
      phone: '',
      kind: 'Registrado',
      photoUrl: null,
    });
  });

  it('debe retornar el telefono si el usuario tiene', async () => {
    const user = makeUser({ phone: '123456789' });
    getCurrentUser.execute.mockResolvedValue(user);

    const req = { user: { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' as const } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.getMe(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '123456789' })
    );
  });

  it('debe manejar error AppError y retornar su statusCode', async () => {
    getCurrentUser.execute.mockRejectedValue(new AppError('Usuario no encontrado.', 404));

    const req = { user: { _id: 'user-inexistente', email: 'test@test.com', kind: 'Registrado' as const } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado.' });
  });

  it('debe retornar 500 para errores desconocidos', async () => {
    getCurrentUser.execute.mockRejectedValue(new Error('error inesperado'));

    const req = { user: { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' as const } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener perfil' });
  });
});
