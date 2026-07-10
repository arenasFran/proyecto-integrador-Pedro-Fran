export type OrderStatus = 'pending' | 'paid' | 'delivered' | 'cancelled' | 'refunded' | 'disputed';

export type StatusHistoryEntry = {
  status: OrderStatus;
  timestamp: string;
  actor: string;
};

export type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type Order = {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  paymentId?: string;
  mpPaymentId?: string;
  mpStatusDetail?: string;
  paymentMethod?: string;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};

export type OrdersResponse = {
  orders: Order[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export type CreateOrderPayload = {
  items: { productId: string; quantity: number }[];
  paymentMethod?: 'online' | 'local';
};
