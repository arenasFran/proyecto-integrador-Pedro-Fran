import { ChangePasswordUseCase } from '../../../../src/application/use-cases/user/ChangePasswordUseCase';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockUserRepository, makeMockPasswordHasher, makeMockRefreshTokenRepository } from '../../../test-utils/mocks';

describe('ChangePasswordUseCase', () => {
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let passwordHasher: ReturnType<typeof makeMockPasswordHasher>;
  let refreshTokenRepository: ReturnType<typeof makeMockRefreshTokenRepository>;
  let useCase: ChangePasswordUseCase;

  const baseDto = {
    userId: 'user-1',
    currentPassword: 'OldPass123',
    newPassword: 'NewPass456',
    newPasswordConfirmation: 'NewPass456',
  };

  beforeEach(() => {
    userRepository = makeMockUserRepository();
    passwordHasher = makeMockPasswordHasher();
    refreshTokenRepository = makeMockRefreshTokenRepository();
    useCase = new ChangePasswordUseCase(userRepository as any, passwordHasher as any, refreshTokenRepository as any);

    userRepository.findById.mockResolvedValue({ id: 'user-1', email: 'user@test.com', passwordHash: 'hash-old' });
    passwordHasher.compare.mockResolvedValue(true);
    passwordHasher.hash.mockResolvedValue('hash-new');
  });

  it('debe lanzar error si las contraseñas nuevas no coinciden', async () => {
    await expect(
      useCase.execute({ ...baseDto, newPasswordConfirmation: 'Otra123' }),
    ).rejects.toThrow(/no coinciden/);
  });

  it('debe lanzar error si la nueva contraseña es igual a la actual', async () => {
    await expect(
      useCase.execute({ ...baseDto, newPassword: baseDto.currentPassword, newPasswordConfirmation: baseDto.currentPassword }),
    ).rejects.toThrow(/diferente a la actual/);
  });

  it('debe lanzar error si la nueva contraseña no cumple los requisitos de complejidad', async () => {
    await expect(
      useCase.execute({ ...baseDto, newPassword: 'short', newPasswordConfirmation: 'short' }),
    ).rejects.toThrow(AppError);
  });

  it('debe lanzar 404 si el usuario no existe', async () => {
    userRepository.findById.mockResolvedValue(null);
    await expect(useCase.execute(baseDto)).rejects.toThrow(/Usuario no encontrado/);
  });

  it('debe lanzar 401 si la contraseña actual es incorrecta', async () => {
    passwordHasher.compare.mockResolvedValue(false);
    await expect(useCase.execute(baseDto)).rejects.toThrow(/Contraseña actual incorrecta/);
    expect(userRepository.updatePassword).not.toHaveBeenCalled();
  });

  it('debe actualizar la contraseña, revocar los refresh tokens y devolver el email', async () => {
    const result = await useCase.execute(baseDto);

    expect(passwordHasher.hash).toHaveBeenCalledWith('NewPass456');
    expect(userRepository.updatePassword).toHaveBeenCalledWith('user-1', 'hash-new');
    expect(refreshTokenRepository.revokeAllByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ email: 'user@test.com' });
  });
});
