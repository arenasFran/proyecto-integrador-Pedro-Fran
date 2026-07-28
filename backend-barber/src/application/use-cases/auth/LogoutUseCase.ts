import { MongoRefreshTokenRepository } from '../../../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { IHashService } from '../../ports/IHashService';

export class LogoutUseCase {
  constructor(
    private readonly hashService: IHashService,
    private readonly refreshTokenRepository: MongoRefreshTokenRepository
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const tokenHash = this.hashService.sha256(refreshToken);
    await this.refreshTokenRepository.revoke(tokenHash);
  }
}
