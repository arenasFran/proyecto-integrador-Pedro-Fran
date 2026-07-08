export type OrderStatus = 'pending' | 'paid' | 'cancelled';

export type OrderItemData = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type OrderData = {
  id: string;
  userId: string;
  items: OrderItemData[];
  total: number;
  status: OrderStatus;
  paymentId?: string;
  createdAt: Date;
  updatedAt: Date;
};
