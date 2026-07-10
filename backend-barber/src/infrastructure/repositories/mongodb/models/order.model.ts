import mongoose, { Schema, Document } from 'mongoose';
import type { OrderData, OrderStatus, OrderItemData, StatusHistoryEntry } from '../../../../domain/types/order.types';

export interface IOrderDocument extends Document, Omit<OrderData, 'id'> {
  _id: mongoose.Types.ObjectId;
}

const orderItemSchema = new Schema<OrderItemData>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const statusHistoryEntrySchema = new Schema<StatusHistoryEntry>(
  {
    status: { type: String, enum: ['pending', 'paid', 'delivered', 'cancelled', 'refunded', 'disputed'], required: true },
    timestamp: { type: Date, required: true },
    actor: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrderDocument>(
  {
    userId: { type: String, required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'delivered', 'cancelled', 'refunded', 'disputed'],
      default: 'pending',
    },
    paymentId: { type: String, default: undefined },
    mpPaymentId: { type: String, default: undefined },
    mpStatusDetail: { type: String, default: undefined },
    paymentMethod: { type: String, default: undefined },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
  },
  { timestamps: true }
);

export const OrderModel = mongoose.model<IOrderDocument>('Order', orderSchema);
