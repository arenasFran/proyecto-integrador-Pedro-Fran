import { PasswordResetToken } from '../entities/PasswordResetToken';

export interface IPasswordResetRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  verifyAndConsume(tokenHash: string): Promise<PasswordResetToken | null>;
}
