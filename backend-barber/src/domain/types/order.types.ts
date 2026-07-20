export type OrderStatus = 'pending' | 'paid' | 'delivered' | 'cancelled' | 'refunded' | 'disputed' | 'stock_issue';

export type StatusHistoryEntry = {
  status: OrderStatus;
  timestamp: Date;
  actor: string;
};

export type OrderItemData = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

export type OrderData = {
  id: string;
  userId: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  items: OrderItemData[];
  total: number;
  status: OrderStatus;
  paymentId?: string;
  mpPaymentId?: string;
  mpStatusDetail?: string;
  paymentMethod?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
};
