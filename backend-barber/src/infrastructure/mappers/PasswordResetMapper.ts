import { PasswordResetToken } from '../../domain/entities/PasswordResetToken';
import { IPasswordReset } from '../repositories/mongodb/models/passwordReset.model';

export class PasswordResetMapper {
  static fromDocument(doc: IPasswordReset): PasswordResetToken {
    return PasswordResetToken.create({
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      expiresAt: doc.expiresAt,
    });
  }
}
