import { RefreshToken } from '../../../domain/entities/RefreshToken';
import { IRefreshTokenRepository } from '../../../domain/repositories/IRefreshTokenRepository';
import RefreshTokenModel from './models/refreshToken.model';

export class MongoRefreshTokenRepository implements IRefreshTokenRepository {
  async create(tokenHash: string, userId: string, expiresAt: Date): Promise<RefreshToken> {
    const doc = await RefreshTokenModel.create({
      tokenHash,
      userId,
      expiresAt,
      revoked: false,
    });

    return RefreshToken.create({
      id: doc._id.toString(),
      tokenHash: doc.tokenHash,
      userId: doc.userId.toString(),
      expiresAt: doc.expiresAt,
      revoked: doc.revoked,
      createdAt: doc.createdAt,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const doc = await RefreshTokenModel.findOne({ tokenHash });
    if (!doc) return null;

    return RefreshToken.create({
      id: doc._id.toString(),
      tokenHash: doc.tokenHash,
      userId: doc.userId.toString(),
      expiresAt: doc.expiresAt,
      revoked: doc.revoked,
      createdAt: doc.createdAt,
    });
  }

  async revoke(tokenHash: string): Promise<void> {
    await RefreshTokenModel.updateOne({ tokenHash }, { revoked: true });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ userId, revoked: false }, { revoked: true });
  }
}
