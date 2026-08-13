import { UpdateUserProfileUseCase } from '../../../../src/application/use-cases/user/UpdateUserProfileUseCase';
import { EmailChangeVerifier } from '../../../../src/application/services/EmailChangeVerifier';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockUserRepository, makeMockPasswordHasher } from '../../../test-utils/mocks';

const makeUser = (overrides: Partial<{ id: string; email: string; toPrimitives: () => any }> = {}) => ({
  id: overrides.id ?? 'user-1',
  email: overrides.email ?? 'old@test.com',
  passwordHash: 'hash-1',
  toPrimitives: overrides.toPrimitives ?? (() => ({ id: 'user-1', email: overrides.email ?? 'old@test.com', name: 'Juan' })),
});

describe('UpdateUserProfileUseCase', () => {
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let passwordHasher: ReturnType<typeof makeMockPasswordHasher>;
  let emailChangeVerifier: EmailChangeVerifier;
  let useCase: UpdateUserProfileUseCase;

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    passwordHasher = makeMockPasswordHasher();
    emailChangeVerifier = new EmailChangeVerifier();
    useCase = new UpdateUserProfileUseCase(userRepository as any, passwordHasher as any, emailChangeVerifier);
  });

  it('debe actualizar datos que no incluyen email sin pedir contraseña', async () => {
    userRepository.update.mockResolvedValue(makeUser() as any);

    const result = await useCase.execute('user-1', { name: 'Nuevo Nombre' });

    expect(userRepository.findById).not.toHaveBeenCalled();
    expect(userRepository.update).toHaveBeenCalledWith('user-1', { name: 'Nuevo Nombre' });
    expect(result.oldEmail).toBeUndefined();
  });

  it('debe lanzar 404 si el usuario no existe al cambiar el email', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('user-1', { email: 'nuevo@test.com', currentPassword: 'Pass123' }),
    ).rejects.toThrow(/Usuario no encontrado/);
  });

  it('no debe pedir contraseña si el email nuevo es igual al actual', async () => {
    userRepository.findById.mockResolvedValue(makeUser({ email: 'old@test.com' }));
    userRepository.update.mockResolvedValue(makeUser() as any);

    const result = await useCase.execute('user-1', { email: 'old@test.com' });

    expect(result.oldEmail).toBeUndefined();
    expect(passwordHasher.compare).not.toHaveBeenCalled();
  });

  it('debe rechazar el cambio de email si el nuevo ya está en uso por otro usuario', async () => {
    userRepository.findById.mockResolvedValue(makeUser({ email: 'old@test.com' }));
    userRepository.findByEmail.mockResolvedValue({ id: 'otro-user' } as any);

    await expect(
      useCase.execute('user-1', { email: 'nuevo@test.com', currentPassword: 'Pass123' }),
    ).rejects.toThrow(/Email en uso/);
  });

  it('debe rechazar el cambio de email sin currentPassword', async () => {
    userRepository.findById.mockResolvedValue(makeUser({ email: 'old@test.com' }));
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      useCase.execute('user-1', { email: 'nuevo@test.com' }),
    ).rejects.toThrow(/contraseña actual es obligatoria/);
  });

  it('debe rechazar el cambio de email con currentPassword incorrecta', async () => {
    userRepository.findById.mockResolvedValue(makeUser({ email: 'old@test.com' }));
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.compare.mockResolvedValue(false);

    await expect(
      useCase.execute('user-1', { email: 'nuevo@test.com', currentPassword: 'wrong' }),
    ).rejects.toThrow(/Contraseña actual incorrecta/);
  });

  it('debe cambiar el email con currentPassword correcta y devolver el email viejo', async () => {
    userRepository.findById.mockResolvedValue(makeUser({ email: 'old@test.com' }));
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.compare.mockResolvedValue(true);
    userRepository.update.mockResolvedValue(makeUser({ email: 'nuevo@test.com' }) as any);

    const result = await useCase.execute('user-1', { email: 'nuevo@test.com', currentPassword: 'Pass123' });

    expect(result.oldEmail).toBe('old@test.com');
    expect(userRepository.update).toHaveBeenCalledWith('user-1', { email: 'nuevo@test.com' });
  });

  it('debe lanzar 404 si el usuario no existe al actualizar (sin cambio de email)', async () => {
    userRepository.update.mockResolvedValue(null);

    await expect(useCase.execute('user-1', { name: 'X' })).rejects.toThrow(AppError);
  });

  it('no debe incluir currentPassword en los datos que se persisten', async () => {
    userRepository.findById.mockResolvedValue(makeUser({ email: 'old@test.com' }));
    userRepository.findByEmail.mockResolvedValue(null);
    passwordHasher.compare.mockResolvedValue(true);
    userRepository.update.mockResolvedValue(makeUser() as any);

    await useCase.execute('user-1', { email: 'nuevo@test.com', currentPassword: 'Pass123', name: 'Juan' });

    expect(userRepository.update).toHaveBeenCalledWith('user-1', { email: 'nuevo@test.com', name: 'Juan' });
  });
});
