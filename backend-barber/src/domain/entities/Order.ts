import { OrderData, OrderStatus, OrderItemData } from '../types/order.types';
import { AppError } from '../errors/AppError';

export type OrderProps = OrderData;

export class Order {
  private props: OrderProps;

  private constructor(props: OrderProps) {
    this.props = { ...props };
  }

  static create(data: {
    userId: string;
    items: { productId: string; name: string; price: number; quantity: number }[];
  }): Order {
    const now = new Date();
    const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return new Order({
      id: '',
      userId: data.userId,
      items: data.items.map((i) => ({ ...i })),
      total,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: OrderProps): Order {
    return new Order(props);
  }

  get id(): string { return this.props.id; }
  get userId(): string { return this.props.userId; }
  get items(): OrderItemData[] { return this.props.items.map((i) => ({ ...i })); }
  get total(): number { return this.props.total; }
  get status(): OrderStatus { return this.props.status; }
  get paymentId(): string | undefined { return this.props.paymentId; }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  toPrimitives(): OrderProps {
    return { ...this.props };
  }

  pay(paymentId?: string): void {
    if (this.props.status !== 'pending') {
      throw new AppError('Solo se pueden pagar órdenes pendientes.', 400);
    }
    this.props.status = 'paid';
    if (paymentId) this.props.paymentId = paymentId;
    this.props.updatedAt = new Date();
  }

  deliver(): void {
    if (this.props.status !== 'paid') {
      throw new AppError('Solo se pueden entregar órdenes pagas.', 400);
    }
    this.props.status = 'delivered';
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (this.props.status === 'delivered' || this.props.status === 'cancelled') {
      throw new AppError('No se puede cancelar una orden entregada o ya cancelada.', 400);
    }
    this.props.status = 'cancelled';
    this.props.updatedAt = new Date();
  }
}
