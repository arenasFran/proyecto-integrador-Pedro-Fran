import { DurationMinutes } from '../value-objects/DurationMinutes';
import { Price } from '../value-objects/Price';

export type ServiceCreateProps = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl: string;
};

export type ServicePrimitives = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageUrl: string;
};

type ServiceProps = {
  id: string;
  name: string;
  description: string;
  price: Price;
  durationMinutes: DurationMinutes;
  imageUrl: string;
};

export class Service {
  private props: ServiceProps;

  private constructor(props: ServiceProps) {
    this.props = { ...props };
  }

  static create(props: ServiceCreateProps): Service {
    return new Service({
      ...props,
      price: Price.create(props.price),
      durationMinutes: DurationMinutes.create(props.durationMinutes),
    });
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
    return this.props.price.getValue();
  }

  get durationMinutes(): number {
    return this.props.durationMinutes.getValue();
  }

  get imageUrl(): string {
    return this.props.imageUrl;
  }

  toPrimitives(): ServicePrimitives {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      price: this.price,
      durationMinutes: this.durationMinutes,
      imageUrl: this.imageUrl,
    };
  }
}
