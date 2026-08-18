import { AppError } from '../../../domain/errors/AppError';
import { User } from '../../../domain/entities/User';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';

export const MAX_RESET_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export function assertNotLocked(user: User): void {
  if (user.resetLockedUntil && new Date() < user.resetLockedUntil) {
    const remainingMin = Math.ceil(
      (user.resetLockedUntil.getTime() - new Date().getTime()) / 60000
    );
    throw new AppError(
      `Demasiados intentos fallidos de restablecimiento. Intentalo de nuevo en ${remainingMin} minutos.`,
      429
    );
  }
}

export async function registerFailedAttempt(
  userRepository: MongoUserRepository,
  user: User
): Promise<void> {
  const currentAttempts = (user.resetFailedAttempts || 0) + 1;
  if (currentAttempts >= MAX_RESET_ATTEMPTS) {
    await userRepository.updateUserSecurity(user.id, {
      resetFailedAttempts: currentAttempts,
      resetLockedUntil: new Date(new Date().getTime() + LOCKOUT_DURATION_MS),
    });
  } else {
    await userRepository.updateUserSecurity(user.id, {
      resetFailedAttempts: currentAttempts,
    });
  }
}
