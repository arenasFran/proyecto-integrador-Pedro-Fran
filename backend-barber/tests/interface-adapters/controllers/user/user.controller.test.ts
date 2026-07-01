import { Request, Response } from 'express';
import { UserController } from '../../../../src/interface-adapters/controllers/user/UserController';
import { AppError } from '../../../../src/domain/errors/AppError';
import { User, UserProps } from '../../../../src/domain/entities/User';
import { makeMockUserRepository } from '../../../test-utils/mocks';

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

  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let controller: UserController;

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    controller = new UserController(userRepository);
  });

  it('debe retornar el perfil del usuario autenticado', async () => {
    const user = makeUser();
    userRepository.findById.mockResolvedValue(user);

    const req = { user: { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' as const } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.getMe(req, res);

    expect(userRepository.findById).toHaveBeenCalledWith('user-1');
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
    userRepository.findById.mockResolvedValue(user);

    const req = { user: { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' as const } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.getMe(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '123456789' })
    );
  });

  it('debe manejar error usuario no encontrado', async () => {
    userRepository.findById.mockResolvedValue(null);

    const req = { user: { _id: 'user-inexistente', email: 'test@test.com', kind: 'Registrado' as const } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Usuario no encontrado.' });
  });

  it('debe retornar 500 para errores desconocidos', async () => {
    userRepository.findById.mockRejectedValue(new Error('error inesperado'));

    const req = { user: { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' as const } } as unknown as Request;
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;

    await controller.getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener perfil' });
  });
});
