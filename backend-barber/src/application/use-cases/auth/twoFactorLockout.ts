import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { AppError } from '../../../domain/errors/AppError';

export const MAX_2FA_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// Contador y bloqueo por cuenta compartidos entre "código 2FA incorrecto" (VerifyTwoFactorUseCase)
// y "contraseña incorrecta antes de enviar el código" (SendTwoFactorCodeUseCase): ambos son intentos
// de autenticación fallidos contra la misma cuenta y deben agotar el mismo cupo de intentos.
export async function registerTwoFactorFailure(
  userRepository: MongoUserRepository,
  userId: string,
  currentAttempts: number,
  wrongAttemptMessage: string
): Promise<never> {
  const nextAttempts = currentAttempts + 1;

  if (nextAttempts >= MAX_2FA_ATTEMPTS) {
    const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    await userRepository.updateUserSecurity(userId, {
      twoFactorFailedAttempts: nextAttempts,
      twoFactorLockedUntil: lockedUntil,
    });
    throw new AppError(
      `Demasiados intentos fallidos. Intentalo de nuevo en ${LOCKOUT_DURATION_MS / 60000} minutos.`,
      429
    );
  }

  await userRepository.updateUserSecurity(userId, { twoFactorFailedAttempts: nextAttempts });
  throw new AppError(wrongAttemptMessage, 401);
}
