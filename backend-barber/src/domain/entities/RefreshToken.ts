export type RefreshTokenProps = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
};

export class RefreshToken {
  private props: RefreshTokenProps;

  private constructor(props: RefreshTokenProps) {
    this.props = { ...props };
  }

  static create(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props);
  }

  get id(): string { return this.props.id; }
  get tokenHash(): string { return this.props.tokenHash; }
  get userId(): string { return this.props.userId; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get revoked(): boolean { return this.props.revoked; }
  get createdAt(): Date { return this.props.createdAt; }

  isExpired(now: Date): boolean {
    return now > this.props.expiresAt;
  }

  revoke(): RefreshToken {
    return new RefreshToken({ ...this.props, revoked: true });
  }
}
