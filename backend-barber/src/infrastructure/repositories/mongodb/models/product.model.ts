import mongoose, { Schema, Document } from 'mongoose';
import type { ProductData, ProductStatus } from '../../../../domain/types/product.types';

export interface IProductDocument extends Document, Omit<ProductData, 'id'> {
  _id: mongoose.Types.ObjectId;
}

const productSchema = new Schema<IProductDocument>(
  {
    name: { type: String, required: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String, default: '' },
    category: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active' },
  },
  { timestamps: true }
);

export const ProductModel = mongoose.model<IProductDocument>('Product', productSchema);
