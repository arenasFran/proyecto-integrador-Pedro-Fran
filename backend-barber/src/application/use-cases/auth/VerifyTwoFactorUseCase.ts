import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Email } from '../../../domain/value-objects/Email';
import { TwoFactorVerifyDTO } from '../../dto/auth/TwoFactorVerifyDTO';
import { AppError } from '../../errors/AppError';
import { IDateTimeProvider } from '../../ports/IDateTimeProvider';
import { IHashService } from '../../ports/IHashService';
import { ITokenService } from '../../ports/ITokenService';

export class VerifyTwoFactorUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly hashService: IHashService,
    private readonly dateTimeProvider: IDateTimeProvider,
    private readonly refreshTokenRepository: IRefreshTokenRepository
  ) {}

  async execute(dto: TwoFactorVerifyDTO): Promise<{ message: string; token: string; refreshToken: string }> {
    const email = Email.create(dto.email).getValue();
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new AppError('Usuario no encontrado.', 401);
    }

    if (!user.twoFactor?.codeHash || !user.twoFactor?.expiresAt) {
      throw new AppError('No hay código activo.', 401);
    }

    if (this.dateTimeProvider.now() > user.twoFactor.expiresAt) {
      await this.userRepository.updateTwoFactor(user.id, {
        codeHash: undefined,
        expiresAt: undefined,
      });
      throw new AppError('El código expiró.', 401);
    }

    if (user.twoFactor.codeHash !== this.hashService.sha256(dto.code)) {
      throw new AppError('Código incorrecto.', 401);
    }

    await this.userRepository.updateTwoFactor(user.id, {
      codeHash: undefined,
      expiresAt: undefined,
    });

    const tokenPayload = { id: user.id, email: user.email, kind: user.kind };
    const token = this.tokenService.signAccessToken(tokenPayload);
    const refreshToken = this.tokenService.signRefreshToken(tokenPayload);

    const tokenHash = this.hashService.sha256(refreshToken);
    const expiresAt = new Date(this.dateTimeProvider.now().getTime() + 7 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create(tokenHash, user.id, expiresAt);
    await this.userRepository.updateLastLogin(user.id);

    return { message: 'Login exitoso', token, refreshToken };
  }
}
