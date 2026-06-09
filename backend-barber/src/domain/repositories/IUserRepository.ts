import { User } from '../entities/User';

export type TwoFactorUpdate = {
  codeHash?: string;
  expiresAt?: Date;
};

export type UserSecurityUpdate = {
  twoFactorFailedAttempts?: number | null;
  twoFactorLockedUntil?: Date | null;
  resetFailedAttempts?: number | null;
  resetLockedUntil?: Date | null;
};

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  createRegisteredClient(user: User): Promise<User>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  updateTwoFactor(userId: string, update: TwoFactorUpdate): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;
  updateUserSecurity(userId: string, update: UserSecurityUpdate): Promise<void>;
}
