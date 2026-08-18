import { MongoPasswordResetRepository } from '../../../infrastructure/repositories/mongodb/MongoPasswordResetRepository';
import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Password } from '../../../domain/value-objects/Password';
import { AppError } from '../../../domain/errors/AppError';

type ResetPasswordDTO = {
  email: string;
  code: string;
  password: string;
  repeatPassword: string;
};
import { IHashService } from '../../ports/IHashService';
import { IPasswordHasher } from '../../ports/IPasswordHasher';
import { assertNotLocked, registerFailedAttempt } from './resetLockout';

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly passwordResetRepository: MongoPasswordResetRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly hashService: IHashService,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository
  ) {}

  async execute(dto: ResetPasswordDTO): Promise<{ message: string }> {
    if (dto.password !== dto.repeatPassword) {
      throw new AppError('Las contraseñas no coinciden.', 400);
    }
    Password.create(dto.password);

    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new AppError('Código inválido o expirado.', 400);
    }

    assertNotLocked(user);

    const codeHash = this.hashService.sha256(dto.code.trim());

    // Consumir el código
    const tokenDoc = await this.passwordResetRepository.verifyAndConsume(codeHash);

    if (!tokenDoc || tokenDoc.userId !== user.id) {
      await registerFailedAttempt(this.userRepository, user);
      throw new AppError('Código inválido o expirado.', 400);
    }

    await this.userRepository.updateUserSecurity(tokenDoc.userId, {
      resetFailedAttempts: 0,
      resetLockedUntil: null,
    });

    const hash = await this.passwordHasher.hash(dto.password);
    await this.userRepository.updatePassword(tokenDoc.userId, hash);

    await this.refreshTokenRepository.revokeAllByUserId(tokenDoc.userId);

    return { message: 'Contraseña restablecida con éxito' };
  }
}


