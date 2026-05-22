import { PasswordResetToken } from '../../../domain/entities/PasswordResetToken';
import { IPasswordResetRepository } from '../../../domain/repositories/IPasswordResetRepository';
import { PasswordResetMapper } from '../../mappers/PasswordResetMapper';
import PasswordReset from './models/passwordReset.model';

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

    return PasswordResetMapper.fromDocument(doc);
  }
}
