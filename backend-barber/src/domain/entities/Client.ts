export type ClientProps = {
  id: string;
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
  kind: 'Registrado' | 'NoRegistrado';
  photoUrl?: string | null;
  registeredAt?: Date;
};

export class Client {
  private props: ClientProps;

  private constructor(props: ClientProps) {
    this.props = { ...props };
  }

  static create(props: ClientProps): Client {
    return new Client(props);
  }

  get id(): string {
    return this.props.id;
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

  get contactEmail(): string | undefined {
    return this.props.contactEmail;
  }

  get kind(): 'Registrado' | 'NoRegistrado' {
    return this.props.kind;
  }

  get photoUrl(): string | null | undefined {
    return this.props.photoUrl;
  }

  get registeredAt(): Date | undefined {
    return this.props.registeredAt;
  }

  toPrimitives(): ClientProps {
    return { ...this.props };
  }
}