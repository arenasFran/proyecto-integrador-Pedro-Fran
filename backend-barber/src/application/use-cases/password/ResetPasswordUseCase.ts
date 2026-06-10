import { IPasswordResetRepository } from '../../../domain/repositories/IPasswordResetRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Password } from '../../../domain/value-objects/Password';
import { ResetPasswordDTO } from '../../dto/password/ResetPasswordDTO';
import { AppError } from '../../errors/AppError';
import { IDateTimeProvider } from '../../ports/IDateTimeProvider';
import { IHashService } from '../../ports/IHashService';
import { IPasswordHasher } from '../../ports/IPasswordHasher';

const MAX_RESET_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly hashService: IHashService,
    private readonly dateTimeProvider: IDateTimeProvider
  ) {}

  async execute(dto: ResetPasswordDTO): Promise<{ message: string }> {
    Password.create(dto.password);

    const tokenHash = this.hashService.sha256(dto.token);
    const user = await this.userRepository.findByEmail(dto.email);

    if (user && user.resetLockedUntil && this.dateTimeProvider.now() < user.resetLockedUntil) {
      const remainingMin = Math.ceil(
        (user.resetLockedUntil.getTime() - this.dateTimeProvider.now().getTime()) / 60000
      );
      throw new AppError(
        `Demasiados intentos fallidos de restablecimiento. Intentalo de nuevo en ${remainingMin} minutos.`,
        429
      );
    }

    const tokenDoc = await this.passwordResetRepository.verifyAndConsume(tokenHash);

    if (!tokenDoc) {
      if (user) {
        const currentAttempts = (user.resetFailedAttempts || 0) + 1;
        if (currentAttempts >= MAX_RESET_ATTEMPTS) {
          const lockedUntil = new Date(this.dateTimeProvider.now().getTime() + LOCKOUT_DURATION_MS);
          await this.userRepository.updateUserSecurity(user.id, {
            resetFailedAttempts: currentAttempts,
            resetLockedUntil: lockedUntil,
          });
          throw new AppError(
            `Demasiados intentos fallidos. Intentalo de nuevo en ${LOCKOUT_DURATION_MS / 60000} minutos.`,
            429
          );
        }
        await this.userRepository.updateUserSecurity(user.id, {
          resetFailedAttempts: currentAttempts,
        });
      }
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
}
