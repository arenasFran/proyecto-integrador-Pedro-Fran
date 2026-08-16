import { PasswordResetToken } from '../../../domain/entities/PasswordResetToken';
import PasswordReset from './models/passwordReset.model';

const toPasswordResetEntity = (doc: Record<string, any>): PasswordResetToken =>
  PasswordResetToken.create({
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    expiresAt: doc.expiresAt,
  });

export class MongoPasswordResetRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    const doc = new PasswordReset({ userId, tokenHash, expiresAt });
    await doc.save();
  }

  async verify(tokenHash: string): Promise<PasswordResetToken | null> {
    const doc = await PasswordReset.findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (!doc) {
      return null;
    }

    return toPasswordResetEntity(doc);
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
