import crypto from 'crypto';
import { MongoTelegramLinkTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoTelegramLinkTokenRepository';
import { IHashService } from '../../ports/IHashService';

const TOKEN_EXPIRATION_MS = 10 * 60 * 1000;

export class GenerateTelegramLinkTokenUseCase {
  constructor(
    private readonly telegramLinkTokenRepository: MongoTelegramLinkTokenRepository,
    private readonly hashService: IHashService,
    private readonly botUsername: string
  ) {}

  async execute(userId: string): Promise<{ token: string; deepLink: string }> {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashService.sha256(token);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    await this.telegramLinkTokenRepository.create(userId, tokenHash, expiresAt);

    const deepLink = this.botUsername ? `https://t.me/${this.botUsername}?start=${token}` : '';
    return { token, deepLink };
  }
}
