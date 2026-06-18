import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import { AppError } from '../../errors/AppError';
import { IHashService } from '../../ports/IHashService';
import { ITokenService, TokenPayload } from '../../ports/ITokenService';

export class RefreshTokenUseCase {
  constructor(
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly hashService: IHashService
  ) {}

  async execute(refreshToken: string): Promise<{ message: string; token: string; refreshToken: string }> {
    let payload: TokenPayload;
    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Refresh token inválido o expirado.', 401);
    }

    const tokenHash = this.hashService.sha256(refreshToken);
    const storedToken = await this.refreshTokenRepository.findByTokenHash(tokenHash);

    if (!storedToken) {
      throw new AppError('Refresh token inválido o expirado.', 401);
    }

    if (storedToken.revoked) {
      await this.refreshTokenRepository.revokeAllByUserId(payload.id);
      throw new AppError('Refresh token ya utilizado. Su sesión ha sido invalidada por seguridad.', 401);
    }

    if (storedToken.isExpired(new Date())) {
      throw new AppError('Refresh token expirado.', 401);
    }

    await this.refreshTokenRepository.revoke(tokenHash);

    const newAccessToken = this.tokenService.signAccessToken(payload);
    const newRefreshToken = this.tokenService.signRefreshToken(payload);
    const newTokenHash = this.hashService.sha256(newRefreshToken);

    await this.refreshTokenRepository.create(
      newTokenHash,
      payload.id,
      new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000)
    );

    return { message: 'Token renovado', token: newAccessToken, refreshToken: newRefreshToken };
  }
}
