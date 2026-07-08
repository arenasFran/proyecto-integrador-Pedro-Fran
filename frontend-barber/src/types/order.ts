export type OrderStatus = 'pending' | 'paid' | 'cancelled';

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
};
