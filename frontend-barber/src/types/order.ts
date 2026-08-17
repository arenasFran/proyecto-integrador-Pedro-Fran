export type OrderStatus = 'pending' | 'paid' | 'delivered' | 'cancelled' | 'refunded' | 'disputed' | 'stock_issue';

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
  imageUrl?: string;
};

export type Order = {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
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

export type CreateManualOrderPayload = {
  items: { productId: string; quantity: number }[];
  userId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  status?: 'pending' | 'paid' | 'delivered';
};
