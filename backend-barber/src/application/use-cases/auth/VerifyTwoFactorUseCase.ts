import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { AppError } from '../../../domain/errors/AppError';

type TwoFactorVerifyDTO = {
  email: string;
  code: string;
};
import { IHashService } from '../../ports/IHashService';
import { ITokenService } from '../../ports/ITokenService';

const MAX_2FA_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class VerifyTwoFactorUseCase {
  constructor(
    private readonly userRepository: MongoUserRepository,
    private readonly tokenService: ITokenService,
    private readonly hashService: IHashService,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository
  ) {}

  async execute(dto: TwoFactorVerifyDTO): Promise<{ message: string; token: string; refreshToken: string }> {
    const email = Email.create(dto.email).getValue();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('Usuario no encontrado.', 401);
    }

    if (user.twoFactorLockedUntil && new Date() < user.twoFactorLockedUntil) {
      const remainingMin = Math.ceil(
        (user.twoFactorLockedUntil.getTime() - new Date().getTime()) / 60000
      );
      throw new AppError(`Demasiados intentos fallidos. Intentalo de nuevo en ${remainingMin} minutos.`, 429);
    }

    if (!user.twoFactor?.codeHash || !user.twoFactor?.expiresAt) {
      throw new AppError('No hay código activo.', 401);
    }

    if (new Date() > user.twoFactor.expiresAt) {
      await this.userRepository.updateTwoFactor(user.id, {
        codeHash: undefined,
        expiresAt: undefined,
      });
      throw new AppError('El código expiró.', 401);
    }

    if (!this.hashService.constantTimeEqual(user.twoFactor.codeHash, this.hashService.sha256(dto.code))) {
      const currentAttempts = (user.twoFactorFailedAttempts || 0) + 1;
      if (currentAttempts >= MAX_2FA_ATTEMPTS) {
        const lockedUntil = new Date(new Date().getTime() + LOCKOUT_DURATION_MS);
        await this.userRepository.updateUserSecurity(user.id, {
          twoFactorFailedAttempts: currentAttempts,
          twoFactorLockedUntil: lockedUntil,
        });
        throw new AppError(
          `Demasiados intentos fallidos. Intentalo de nuevo en ${LOCKOUT_DURATION_MS / 60000} minutos.`,
          429
        );
      }
      await this.userRepository.updateUserSecurity(user.id, {
        twoFactorFailedAttempts: currentAttempts,
      });
      throw new AppError('Código incorrecto.', 401);
    }

    await this.userRepository.updateUserSecurity(user.id, {
      twoFactorFailedAttempts: 0,
      twoFactorLockedUntil: null,
    });

    await this.userRepository.updateTwoFactor(user.id, {
      codeHash: undefined,
      expiresAt: undefined,
    });

    const tokenPayload = { id: user.id, email: user.email, kind: user.kind };
    const token = this.tokenService.signAccessToken(tokenPayload);
    const refreshToken = this.tokenService.signRefreshToken(tokenPayload);

    const tokenHash = this.hashService.sha256(refreshToken);
    const expiresAt = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create(tokenHash, user.id, expiresAt);
    await this.userRepository.updateLastLogin(user.id);

    return { message: 'Login exitoso', token, refreshToken };
  }
}


