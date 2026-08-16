export type ClientProps = {
  id: string;
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
  kind: 'Registrado' | 'NoRegistrado';
  photoUrl?: string | null;
  registeredAt?: Date;
  consentimientoAnalisisIA?: boolean;
  consentimientoAnalisisIAFecha?: Date | null;
  ultimoAnalisisFecha?: Date | null;
  noShowCount?: number;
  sancionado?: boolean;
  fechaSancion?: Date | null;
  motivoSancion?: string | null;
  sancionadoPor?: string | null;
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

  get consentimientoAnalisisIA(): boolean {
    return this.props.consentimientoAnalisisIA ?? false;
  }

  get consentimientoAnalisisIAFecha(): Date | null {
    return this.props.consentimientoAnalisisIAFecha ?? null;
  }

  get ultimoAnalisisFecha(): Date | null {
    return this.props.ultimoAnalisisFecha ?? null;
  }

  get noShowCount(): number {
    return this.props.noShowCount ?? 0;
  }

  get sancionado(): boolean {
    return this.props.sancionado ?? false;
  }

  get fechaSancion(): Date | null {
    return this.props.fechaSancion ? new Date(this.props.fechaSancion.getTime()) : null;
  }

  get motivoSancion(): string | null {
    return this.props.motivoSancion ?? null;
  }

  get sancionadoPor(): string | null {
    return this.props.sancionadoPor ?? null;
  }

  toPrimitives(): ClientProps {
    return { ...this.props };
  }
}