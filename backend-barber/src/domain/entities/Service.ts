export type ServiceProps = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl: string;
};

export class Service {
  private props: ServiceProps;

  private constructor(props: ServiceProps) {
    this.props = { ...props };
  }

  static create(props: ServiceProps): Service {
    return new Service(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get price(): number {
    return this.props.price;
  }

  get durationMinutes(): number {
    return this.props.durationMinutes;
  }

  get imageUrl(): string {
    return this.props.imageUrl;
  }

  toPrimitives(): ServiceProps {
    return { ...this.props };
  }
}
