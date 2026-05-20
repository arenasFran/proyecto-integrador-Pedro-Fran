export type PasswordResetTokenProps = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export class PasswordResetToken {
  private props: PasswordResetTokenProps;

  private constructor(props: PasswordResetTokenProps) {
    this.props = { ...props };
  }

  static create(props: PasswordResetTokenProps): PasswordResetToken {
    return new PasswordResetToken(props);
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }
}
