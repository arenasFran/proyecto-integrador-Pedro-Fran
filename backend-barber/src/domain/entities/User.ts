import { AuthKind } from '../types/auth';

export type AuthProvider = 'local' | 'google';

export type TwoFactorState = {
  codeHash?: string;
  expiresAt?: Date;
};

export type UserProps = {
  id: string;
  email: string;
  name: string;
  lastname: string;
  phone?: string;
  kind: AuthKind;
  authProvider: AuthProvider;
  passwordHash?: string;
  googleId?: string;
  twoFactor?: TwoFactorState;
  lastLoginAt?: Date;
  twoFactorFailedAttempts?: number;
  twoFactorLockedUntil?: Date;
  photoUrl?: string | null;
  resetFailedAttempts?: number;
  resetLockedUntil?: Date;
};

export class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = { ...props };
  }

  static create(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string {
    return this.props.name;
  }

  get lastname(): string {
    return this.props.lastname;
  }

  get phone(): string | undefined {
    return this.props.phone;
  }

  get kind(): AuthKind {
    return this.props.kind;
  }

  get authProvider(): AuthProvider {
    return this.props.authProvider;
  }

  get passwordHash(): string | undefined {
    return this.props.passwordHash;
  }

  get googleId(): string | undefined {
    return this.props.googleId;
  }

  get twoFactor(): TwoFactorState | undefined {
    if (!this.props.twoFactor) return undefined;
    return {
      codeHash: this.props.twoFactor.codeHash,
      expiresAt: this.props.twoFactor.expiresAt ? new Date(this.props.twoFactor.expiresAt.getTime()) : undefined,
    };
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt ? new Date(this.props.lastLoginAt.getTime()) : undefined;
  }

  get twoFactorFailedAttempts(): number | undefined {
    return this.props.twoFactorFailedAttempts;
  }

  get twoFactorLockedUntil(): Date | undefined {
    return this.props.twoFactorLockedUntil ? new Date(this.props.twoFactorLockedUntil.getTime()) : undefined;
  }

  get resetFailedAttempts(): number | undefined {
    return this.props.resetFailedAttempts;
  }

  get resetLockedUntil(): Date | undefined {
    return this.props.resetLockedUntil ? new Date(this.props.resetLockedUntil.getTime()) : undefined;
  }

  get photoUrl(): string | null | undefined {
    return this.props.photoUrl;
  }

  withPasswordHash(passwordHash?: string): User {
    return new User({ ...this.props, passwordHash });
  }

  withTwoFactor(twoFactor?: TwoFactorState): User {
    return new User({ ...this.props, twoFactor });
  }

  withTwoFactorFailedAttempts(failedAttempts: number, lockedUntil?: Date): User {
    return new User({ ...this.props, twoFactorFailedAttempts: failedAttempts, twoFactorLockedUntil: lockedUntil });
  }

  withTwoFactorLockoutReset(): User {
    return new User({ ...this.props, twoFactorFailedAttempts: 0, twoFactorLockedUntil: undefined });
  }

  withResetFailedAttempts(failedAttempts: number, lockedUntil?: Date): User {
    return new User({ ...this.props, resetFailedAttempts: failedAttempts, resetLockedUntil: lockedUntil });
  }

  withResetLockoutReset(): User {
    return new User({ ...this.props, resetFailedAttempts: 0, resetLockedUntil: undefined });
  }

  withLastLoginAt(date: Date): User {
    return new User({ ...this.props, lastLoginAt: date });
  }

  toPrimitives(): UserProps {
    return { ...this.props };
  }
}
