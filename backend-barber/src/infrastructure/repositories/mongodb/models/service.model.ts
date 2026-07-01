import mongoose, { Document, Schema } from 'mongoose';

export type ServiceStatus = 'active' | 'inactive' | 'deleted';

export interface IServiceDocument extends Document {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  status: ServiceStatus;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IServiceDocument>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0.01,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'deleted'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IServiceDocument>('Service', serviceSchema);
