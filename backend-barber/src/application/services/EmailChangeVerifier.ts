import { AppError } from '../../domain/errors/AppError';

export class EmailChangeVerifier {
  async verifyEmailChange(
    entity: { id: string; email: string; passwordHash?: string },
    newEmail: string,
    currentPassword: string | undefined,
    userRepoForUniqueness: { findByEmail(email: string): Promise<{ id: string } | null> },
    passwordHasher: { compare(plain: string, hash: string): Promise<boolean> }
  ): Promise<string | undefined> {
    if (newEmail === entity.email) {
      return undefined;
    }

    const existing = await userRepoForUniqueness.findByEmail(newEmail);
    if (existing && existing.id !== entity.id) {
      throw new AppError('Email en uso.', 409);
    }

    if (!currentPassword) {
      throw new AppError('La contraseña actual es obligatoria para cambiar el email.', 400);
    }

    const valid = await passwordHasher.compare(currentPassword, entity.passwordHash!);
    if (!valid) {
      throw new AppError('Contraseña actual incorrecta.', 401);
    }

    return entity.email;
  }
}
