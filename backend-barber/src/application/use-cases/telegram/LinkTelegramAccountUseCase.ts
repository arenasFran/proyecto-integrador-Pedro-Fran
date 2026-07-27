import { AppError } from '../../../domain/errors/AppError';
import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoTelegramLinkRepository } from '../../../infrastructure/repositories/mongodb/MongoTelegramLinkRepository';
import { MongoTelegramLinkTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoTelegramLinkTokenRepository';
import { MongoUserRepository } from '../../../infrastructure/repositories/mongodb/MongoUserRepository';
import { IHashService } from '../../ports/IHashService';
import { ITokenService } from '../../ports/ITokenService';

const REFRESH_TOKEN_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

type LinkTelegramAccountDTO = {
  token: string;
  telegramId: number;
};

export class LinkTelegramAccountUseCase {
  constructor(
    private readonly tokenService: ITokenService,
    private readonly hashService: IHashService,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository,
    private readonly telegramLinkTokenRepository: MongoTelegramLinkTokenRepository,
    private readonly telegramLinkRepository: MongoTelegramLinkRepository,
    private readonly userRepository: MongoUserRepository
  ) {}

  async execute(dto: LinkTelegramAccountDTO): Promise<{ message: string }> {
    const tokenHash = this.hashService.sha256(dto.token);
    const consumed = await this.telegramLinkTokenRepository.verifyAndConsume(tokenHash);
    if (!consumed) {
      throw new AppError('Token de vinculación inválido o expirado.', 400);
    }

    const user = await this.userRepository.findById(consumed.userId);
    if (!user) {
      throw new AppError('Usuario no encontrado.', 404);
    }

    const existingByTelegram = await this.telegramLinkRepository.findByTelegramId(dto.telegramId);
    if (existingByTelegram && existingByTelegram.userId !== consumed.userId) {
      throw new AppError('Ese Telegram ya está vinculado a otra cuenta.', 409);
    }

    const existingByUser = await this.telegramLinkRepository.findByUserId(consumed.userId);
    if (existingByUser && existingByUser.telegramId !== dto.telegramId) {
      throw new AppError(
        'Tu cuenta ya está vinculada a otro Telegram. Desvinculá esa antes de conectar una nueva.',
        409
      );
    }

    const payload = { id: user.id, email: user.email, kind: user.kind };
    const refreshToken = this.tokenService.signRefreshToken(payload);
    const refreshTokenHash = this.hashService.sha256(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRATION_MS);
    await this.refreshTokenRepository.create(refreshTokenHash, user.id, expiresAt);

    await this.telegramLinkRepository.upsert({
      userId: user.id,
      telegramId: dto.telegramId,
      refreshToken,
    });

    return { message: 'Cuenta vinculada correctamente.' };
  }
}
