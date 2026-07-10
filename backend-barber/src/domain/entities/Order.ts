import { OrderData, OrderStatus, OrderItemData, StatusHistoryEntry } from '../types/order.types';
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
      statusHistory: [{ status: 'pending', timestamp: now, actor: 'system' }],
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
  get mpPaymentId(): string | undefined { return this.props.mpPaymentId; }
  get mpStatusDetail(): string | undefined { return this.props.mpStatusDetail; }
  get paymentMethod(): string | undefined { return this.props.paymentMethod; }
  get statusHistory(): StatusHistoryEntry[] { return this.props.statusHistory.map((e) => ({ ...e, timestamp: new Date(e.timestamp.getTime()) })); }
  get createdAt(): Date { return new Date(this.props.createdAt.getTime()); }
  get updatedAt(): Date { return new Date(this.props.updatedAt.getTime()); }

  toPrimitives(): OrderProps {
    return { ...this.props };
  }

  private addHistoryEntry(status: OrderStatus, actor: string): void {
    this.props.statusHistory.push({ status, timestamp: new Date(), actor });
  }

  pay(paymentId?: string): void {
    if (this.props.status !== 'pending') {
      throw new AppError('Solo se pueden pagar órdenes pendientes.', 400);
    }
    this.props.status = 'paid';
    if (paymentId) this.props.paymentId = paymentId;
    this.props.updatedAt = new Date();
    this.addHistoryEntry('paid', 'system');
  }

  deliver(): void {
    if (this.props.status !== 'pending' && this.props.status !== 'paid') {
      throw new AppError('Solo se pueden entregar órdenes pendientes o pagas.', 400);
    }
    this.props.status = 'delivered';
    this.props.updatedAt = new Date();
    this.addHistoryEntry('delivered', 'system');
  }

  cancel(actor: string = 'system'): void {
    if (this.props.status === 'delivered' || this.props.status === 'cancelled' || this.props.status === 'refunded') {
      throw new AppError('No se puede cancelar una orden entregada, ya cancelada o reembolsada.', 400);
    }
    this.props.status = 'cancelled';
    this.props.updatedAt = new Date();
    this.addHistoryEntry('cancelled', actor);
  }

  refund(): void {
    if (this.props.status !== 'paid') {
      throw new AppError('Solo se pueden reembolsar órdenes pagas.', 400);
    }
    this.props.status = 'refunded';
    this.props.updatedAt = new Date();
    this.addHistoryEntry('refunded', 'system');
  }

  markAsDisputed(): void {
    this.props.status = 'disputed';
    this.props.updatedAt = new Date();
    this.addHistoryEntry('disputed', 'system');
  }

  updateMpMetadata(mpPaymentId: string, mpStatusDetail?: string, paymentMethod?: string): void {
    this.props.mpPaymentId = mpPaymentId;
    if (mpStatusDetail) this.props.mpStatusDetail = mpStatusDetail;
    if (paymentMethod) this.props.paymentMethod = paymentMethod;
    this.props.updatedAt = new Date();
  }
}
