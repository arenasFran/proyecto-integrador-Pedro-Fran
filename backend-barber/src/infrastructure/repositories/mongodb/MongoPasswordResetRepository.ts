import { PasswordResetToken } from '../../../domain/entities/PasswordResetToken';
import { IPasswordResetRepository } from '../../../domain/repositories/IPasswordResetRepository';
import PasswordReset from './models/passwordReset.model';

const toPasswordResetEntity = (doc: Record<string, any>): PasswordResetToken =>
  PasswordResetToken.create({
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    expiresAt: doc.expiresAt,
  });

export class MongoPasswordResetRepository implements IPasswordResetRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const doc = new PasswordReset({ userId, tokenHash, expiresAt });
    await doc.save();
  }

  async verifyAndConsume(tokenHash: string): Promise<PasswordResetToken | null> {
    const doc = await PasswordReset.findOneAndUpdate(
      { tokenHash, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true } },
      { returnDocument: 'before' }
    );

    if (!doc) {
      return null;
    }

    return toPasswordResetEntity(doc);
  }
}
