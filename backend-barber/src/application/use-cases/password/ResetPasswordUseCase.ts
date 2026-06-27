import { MongoPasswordResetRepository } from '../../../infrastructure/repositories/mongodb/MongoPasswordResetRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Password } from '../../../domain/value-objects/Password';
import { AppError } from '../../../domain/errors/AppError';

type ResetPasswordDTO = {
  token: string;
  password: string;
  repeatPassword: string;
  email: string;
};
import { IHashService } from '../../ports/IHashService';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

const MAX_RESET_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordResetRepository: MongoPasswordResetRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly hashService: IHashService
  ) {}

  async execute(dto: ResetPasswordDTO): Promise<{ message: string }> {
    if (dto.password !== dto.repeatPassword) {
      throw new AppError('Las contraseñas no coinciden.', 400);
    }
    Password.create(dto.password);

    const tokenHash = this.hashService.sha256(dto.token);

    // Buscar al usuario primero para poder incrementar failedAttempts en errores
    const user = await this.userRepository.findByEmail(dto.email);

    if (user && user.resetLockedUntil && new Date() < user.resetLockedUntil) {
      const remainingMin = Math.ceil(
        (user.resetLockedUntil.getTime() - new Date().getTime()) / 60000
      );
      throw new AppError(
        `Demasiados intentos fallidos de restablecimiento. Intentalo de nuevo en ${remainingMin} minutos.`,
        429
      );
    }

    // Consumir el token
    const tokenDoc = await this.passwordResetRepository.verifyAndConsume(tokenHash);

    if (!tokenDoc) {
      // Token inválido o expirado — incrementar contador si encontramos al usuario
      if (user) {
        const currentAttempts = (user.resetFailedAttempts || 0) + 1;
        await this.incrementOrLockout(user, currentAttempts);
      }
      throw new AppError('Token inválido o expirado', 400);
    }

    if (!user) {
      throw new AppError('Token inválido o expirado', 400);
    }

    // Verificar que el token pertenece al usuario
    if (tokenDoc.userId !== user.id) {
      const currentAttempts = (user.resetFailedAttempts || 0) + 1;
      await this.incrementOrLockout(user, currentAttempts);
      throw new AppError('Token inválido o expirado', 400);
    }

    await this.userRepository.updateUserSecurity(tokenDoc.userId, {
      resetFailedAttempts: 0,
      resetLockedUntil: null,
    });

    const hash = await this.passwordHasher.hash(dto.password);
    await this.userRepository.updatePassword(tokenDoc.userId, hash);

    return { message: 'Contraseña restablecida con éxito' };
  }

  private async incrementOrLockout(
    user: import('../../../domain/entities/User').User,
    currentAttempts: number
  ): Promise<void> {
    if (currentAttempts >= MAX_RESET_ATTEMPTS) {
      const lockedUntil = new Date(new Date().getTime() + LOCKOUT_DURATION_MS);
      await this.userRepository.updateUserSecurity(user.id, {
        resetFailedAttempts: currentAttempts,
        resetLockedUntil: lockedUntil,
      });
    } else {
      await this.userRepository.updateUserSecurity(user.id, {
        resetFailedAttempts: currentAttempts,
      });
    }
  }
}


