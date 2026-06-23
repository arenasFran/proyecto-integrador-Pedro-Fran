import request from 'supertest';
import express from 'express';
import { createUserRouter } from '../../../src/interface-adapters/routes/user.routes';
import { UserController } from '../../../src/interface-adapters/controllers/user/UserController';
import { User, UserProps } from '../../../src/domain/entities/User';
import { makeMockUserRepository } from '../../test-utils/mocks';

describe('User routes', () => {
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

  let app: express.Application;
  let userRepository: ReturnType<typeof makeMockUserRepository>;

  const authenticate: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' };
    next();
  };

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    const controller = new UserController(userRepository);

    app = express();
    app.use(express.json());
    app.use('/api/user', createUserRouter({ userController: controller, authenticate }));
  });

  it('GET /api/user/me debe retornar el perfil del usuario autenticado', async () => {
    userRepository.findById.mockResolvedValue(makeUser());

    const response = await request(app).get('/api/user/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: 'user-1',
      name: 'Juan',
      lastname: 'Perez',
      email: 'user@example.com',
      phone: '',
      kind: 'Registrado',
      photoUrl: null,
    });
  });

  it('GET /api/user/me debe retornar 404 si el usuario no existe', async () => {
    userRepository.findById.mockResolvedValue(null);

    const response = await request(app).get('/api/user/me');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Usuario no encontrado.' });
  });

  it('GET /api/user/me debe retornar 500 si falla', async () => {
    userRepository.findById.mockRejectedValue(new Error('error inesperado'));

    const response = await request(app).get('/api/user/me');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Error al obtener perfil' });
  });
});
