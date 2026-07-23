import request from 'supertest';
import express from 'express';
import { createUserRouter, changePasswordLimiter, profileUpdateLimiter } from '../../../src/interface-adapters/routes/user.routes';
import { UserController } from '../../../src/interface-adapters/controllers/user/UserController';
import { User, UserProps } from '../../../src/domain/entities/User';
import { makeMockUserRepository, makeMockPasswordHasher, makeMockRefreshTokenRepository, makeMockEmailService } from '../../test-utils/mocks';

describe('User routes', () => {
  const makeUser = (overrides?: Partial<UserProps>) => {
    const base: UserProps = {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Juan',
      lastname: 'Perez',
      kind: 'Registrado',
      authProvider: 'local',
      passwordHash: '$2b$10$hashed_current_password',
    };
    return User.create({ ...base, ...overrides });
  };

  let app: express.Application;
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let passwordHasher: ReturnType<typeof makeMockPasswordHasher>;
  let refreshTokenRepository: ReturnType<typeof makeMockRefreshTokenRepository>;

  const authenticate: express.RequestHandler = (req, _res, next) => {
    (req as any).user = { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' };
    next();
  };

  beforeEach(() => {
    changePasswordLimiter.resetKey('user-1');
    profileUpdateLimiter.resetKey('user-1');
    userRepository = makeMockUserRepository();
    passwordHasher = makeMockPasswordHasher();
    refreshTokenRepository = makeMockRefreshTokenRepository();
    const emailService = makeMockEmailService();
    const controller = new UserController(userRepository, passwordHasher, refreshTokenRepository, emailService);

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

  describe('PUT /api/user/me', () => {
    it('debe actualizar nombre/telefono sin pedir contraseña cuando no cambia el email', async () => {
      const user = makeUser();
      userRepository.update.mockResolvedValue(User.create({ ...user.toPrimitives(), name: 'Carlos' }));

      const response = await request(app)
        .put('/api/user/me')
        .send({ name: 'Carlos' });

      expect(response.status).toBe(200);
      expect(userRepository.update).toHaveBeenCalledWith('user-1', { name: 'Carlos' });
    });

    it('el campo password ya no está en el contrato: la validación lo rechaza', async () => {
      const response = await request(app)
        .put('/api/user/me')
        .send({ password: 'NuevaPass123' });

      expect(response.status).toBe(400);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('debe rechazar el cambio de email sin currentPassword', async () => {
      const user = makeUser();
      userRepository.findById.mockResolvedValue(user);

      const response = await request(app)
        .put('/api/user/me')
        .send({ email: 'nuevo@example.com' });

      expect(response.status).toBe(400);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('debe rechazar el cambio de email con currentPassword incorrecta', async () => {
      const user = makeUser();
      userRepository.findById.mockResolvedValue(user);
      passwordHasher.compare.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/user/me')
        .send({ email: 'nuevo@example.com', currentPassword: 'wrong' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Contraseña actual incorrecta.' });
    });

    it('debe cambiar el email con currentPassword correcta', async () => {
      const user = makeUser();
      userRepository.findById.mockResolvedValue(user);
      passwordHasher.compare.mockResolvedValue(true);
      userRepository.update.mockResolvedValue(User.create({ ...user.toPrimitives(), email: 'nuevo@example.com' }));

      const response = await request(app)
        .put('/api/user/me')
        .send({ email: 'nuevo@example.com', currentPassword: 'CurrentPass1' });

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('nuevo@example.com');
    });

    it('debe aplicar el rate limit de actualización de perfil tras 30 intentos', async () => {
      const user = makeUser();
      userRepository.findById.mockResolvedValue(user);
      passwordHasher.compare.mockResolvedValue(false);

      for (let i = 0; i < 30; i++) {
        await request(app)
          .put('/api/user/me')
          .send({ email: 'nuevo@example.com', currentPassword: 'wrong' });
      }

      const response = await request(app)
        .put('/api/user/me')
        .send({ email: 'nuevo@example.com', currentPassword: 'wrong' });

      expect(response.status).toBe(429);
    });
  });

  describe('PATCH /api/user/me/password', () => {
    const validBody = {
      currentPassword: 'CurrentPass1',
      newPassword: 'NewPass123',
      newPasswordConfirmation: 'NewPass123',
    };

    it('debe cambiar la contraseña exitosamente', async () => {
      const user = makeUser();
      userRepository.findById.mockResolvedValue(user);
      passwordHasher.compare.mockResolvedValue(true);
      passwordHasher.hash.mockResolvedValue('$2b$10$new_hashed_password');
      userRepository.updatePassword.mockResolvedValue(undefined);
      refreshTokenRepository.revokeAllByUserId.mockResolvedValue(undefined);

      const response = await request(app)
        .patch('/api/user/me/password')
        .send(validBody);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Contraseña actualizada con éxito.' });
    });

    it('debe rechazar si las nuevas contraseñas no coinciden', async () => {
      const response = await request(app)
        .patch('/api/user/me/password')
        .send({ ...validBody, newPasswordConfirmation: 'Different123' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Las contraseñas nuevas no coinciden.' });
    });

    it('debe rechazar si la nueva contraseña es igual a la actual', async () => {
      const response = await request(app)
        .patch('/api/user/me/password')
        .send({ currentPassword: 'CurrentPass1', newPassword: 'CurrentPass1', newPasswordConfirmation: 'CurrentPass1' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'La nueva contraseña debe ser diferente a la actual.' });
    });

    it('debe rechazar si la contraseña actual es incorrecta', async () => {
      const user = makeUser();
      userRepository.findById.mockResolvedValue(user);
      passwordHasher.compare.mockResolvedValue(false);

      const response = await request(app)
        .patch('/api/user/me/password')
        .send(validBody);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Contraseña actual incorrecta.' });
    });

    it('debe rechazar si falta currentPassword', async () => {
      const response = await request(app)
        .patch('/api/user/me/password')
        .send({ newPassword: 'NewPass123', newPasswordConfirmation: 'NewPass123' });

      expect(response.status).toBe(400);
    });

    it('debe rechazar si falta newPassword', async () => {
      const response = await request(app)
        .patch('/api/user/me/password')
        .send({ currentPassword: 'CurrentPass1', newPasswordConfirmation: 'NewPass123' });

      expect(response.status).toBe(400);
    });

    it('debe rechazar si falta newPasswordConfirmation', async () => {
      const response = await request(app)
        .patch('/api/user/me/password')
        .send({ currentPassword: 'CurrentPass1', newPassword: 'NewPass123' });

      expect(response.status).toBe(400);
    });
  });
});
