export type UserRole = 'Admin' | 'Empleado' | 'Registrado';
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
  kind: UserRole;
  authProvider: AuthProvider;
  passwordHash?: string;
  googleId?: string;
  twoFactor?: TwoFactorState;
  lastLoginAt?: Date;
  twoFactorFailedAttempts?: number;
  twoFactorLockedUntil?: Date;
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

  get kind(): UserRole {
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
    return this.props.twoFactor;
  }

  get lastLoginAt(): Date | undefined {
    return this.props.lastLoginAt;
  }

  get twoFactorFailedAttempts(): number | undefined {
    return this.props.twoFactorFailedAttempts;
  }

  get twoFactorLockedUntil(): Date | undefined {
    return this.props.twoFactorLockedUntil;
  }

  get resetFailedAttempts(): number | undefined {
    return this.props.resetFailedAttempts;
  }

  get resetLockedUntil(): Date | undefined {
    return this.props.resetLockedUntil;
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
