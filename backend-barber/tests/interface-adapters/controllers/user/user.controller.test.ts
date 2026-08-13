import { Request, Response } from 'express';
import { UserController } from '../../../../src/interface-adapters/controllers/user/UserController';
import { AppError } from '../../../../src/domain/errors/AppError';
import { User, UserProps } from '../../../../src/domain/entities/User';
import { makeMockUserRepository, makeMockPasswordHasher, makeMockRefreshTokenRepository, makeMockEmailService } from '../../../test-utils/mocks';

describe('UserController', () => {
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

  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let emailService: ReturnType<typeof makeMockEmailService>;
  let updateUserProfile: { execute: jest.Mock };
  let changePasswordUseCase: { execute: jest.Mock };
  let controller: UserController;

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    emailService = makeMockEmailService();
    updateUserProfile = { execute: jest.fn() };
    changePasswordUseCase = { execute: jest.fn() };
    controller = new UserController(userRepository, emailService, updateUserProfile as any, changePasswordUseCase as any);
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

  describe('updateMe', () => {
    const makeReq = (body: Record<string, unknown>) =>
      ({
        user: { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' as const },
        body,
      }) as unknown as Request;

    const makeRes = () =>
      ({ status: jest.fn().mockReturnThis(), json: jest.fn() }) as unknown as Response;

    it('debe actualizar nombre/telefono sin pedir contraseña cuando no cambia el email', async () => {
      const user = makeUser();
      updateUserProfile.execute.mockResolvedValue({ user: { ...user.toPrimitives(), name: 'Carlos' } });

      const req = makeReq({ name: 'Carlos' });
      const res = makeRes();

      await controller.updateMe(req, res);

      expect(updateUserProfile.execute).toHaveBeenCalledWith('user-1', { name: 'Carlos' });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe permitir reenviar el mismo email sin pedir contraseña', async () => {
      const user = makeUser();
      updateUserProfile.execute.mockResolvedValue({ user: user.toPrimitives() });

      const req = makeReq({ email: user.email });
      const res = makeRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(emailService.sendMail).not.toHaveBeenCalled();
    });

    it('debe rechazar el cambio de email sin currentPassword', async () => {
      updateUserProfile.execute.mockRejectedValue(new AppError('Se requiere la contraseña actual para cambiar el email.', 400));

      const req = makeReq({ email: 'nuevo@example.com' });
      const res = makeRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('debe rechazar el cambio de email con currentPassword incorrecta', async () => {
      updateUserProfile.execute.mockRejectedValue(new AppError('Contraseña actual incorrecta.', 401));

      const req = makeReq({ email: 'nuevo@example.com', currentPassword: 'wrong' });
      const res = makeRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Contraseña actual incorrecta.' });
    });

    it('debe cambiar el email con currentPassword correcta y avisar al email viejo', async () => {
      const user = makeUser();
      updateUserProfile.execute.mockResolvedValue({ user: { ...user.toPrimitives(), email: 'nuevo@example.com' }, oldEmail: 'user@example.com' });

      const req = makeReq({ email: 'nuevo@example.com', currentPassword: 'CurrentPass1' });
      const res = makeRes();

      await controller.updateMe(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'user@example.com' })
      );
    });

    it('ya no hashea ni procesa un campo password aunque llegue en el body', async () => {
      const user = makeUser();
      updateUserProfile.execute.mockResolvedValue({ user: user.toPrimitives() });

      const req = makeReq({ name: 'Carlos', password: 'Ignorado123' });
      const res = makeRes();

      await controller.updateMe(req, res);

      expect(updateUserProfile.execute).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const validBody = {
      currentPassword: 'CurrentPass1',
      newPassword: 'NewPass123',
      newPasswordConfirmation: 'NewPass123',
    };

    const makeReq = (overrides = {}) =>
      ({
        user: { _id: 'user-1', email: 'test@test.com', kind: 'Registrado' as const },
        body: { ...validBody, ...overrides },
      }) as unknown as Request;

    const makeRes = () =>
      ({ status: jest.fn().mockReturnThis(), json: jest.fn() }) as unknown as Response;

    it('debe cambiar la contraseña exitosamente', async () => {
      changePasswordUseCase.execute.mockResolvedValue({ email: 'user@example.com' });

      const req = makeReq();
      const res = makeRes();

      await controller.changePassword(req, res);

      expect(changePasswordUseCase.execute).toHaveBeenCalledWith({
        userId: 'user-1',
        currentPassword: 'CurrentPass1',
        newPassword: 'NewPass123',
        newPasswordConfirmation: 'NewPass123',
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Contraseña actualizada con éxito.' });
    });

    it('debe rechazar si las nuevas contraseñas no coinciden', async () => {
      changePasswordUseCase.execute.mockRejectedValue(new AppError('Las contraseñas nuevas no coinciden.', 400));

      const req = makeReq({ newPasswordConfirmation: 'Different123' });
      const res = makeRes();

      await controller.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Las contraseñas nuevas no coinciden.' });
    });

    it('debe rechazar si la nueva contraseña es igual a la actual', async () => {
      changePasswordUseCase.execute.mockRejectedValue(new AppError('La nueva contraseña debe ser diferente a la actual.', 400));

      const req = makeReq({ newPassword: 'CurrentPass1', newPasswordConfirmation: 'CurrentPass1' });
      const res = makeRes();

      await controller.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'La nueva contraseña debe ser diferente a la actual.' });
    });

    it('debe rechazar si la nueva contraseña no cumple la política', async () => {
      changePasswordUseCase.execute.mockRejectedValue(new AppError('La contraseña debe tener al menos 8 caracteres.', 400));

      const req = makeReq({ newPassword: 'short', newPasswordConfirmation: 'short' });
      const res = makeRes();

      await controller.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: expect.stringContaining('8 caracteres') });
    });

    it('debe rechazar si la contraseña actual es incorrecta', async () => {
      changePasswordUseCase.execute.mockRejectedValue(new AppError('Contraseña actual incorrecta.', 401));

      const req = makeReq();
      const res = makeRes();

      await controller.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Contraseña actual incorrecta.' });
    });

    it('debe retornar 500 para errores desconocidos', async () => {
      changePasswordUseCase.execute.mockRejectedValue(new Error('error inesperado'));

      const req = makeReq();
      const res = makeRes();

      await controller.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al cambiar la contraseña' });
    });
  });
});
