import { RefreshToken } from '../entities/RefreshToken';

export interface IRefreshTokenRepository {
  create(tokenHash: string, userId: string, expiresAt: Date): Promise<RefreshToken>;
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  revoke(tokenHash: string): Promise<void>;
  revokeAllByUserId(userId: string): Promise<void>;
}
