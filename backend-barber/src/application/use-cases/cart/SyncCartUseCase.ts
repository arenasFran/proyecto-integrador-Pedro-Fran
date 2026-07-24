import { AppError } from '../../../domain/errors/AppError';
import { CartModel } from '../../../infrastructure/repositories/mongodb/models/cart.model';

export interface SyncCartDTO {
  userId: string;
  items: { productId: string; quantity: number }[];
}

export interface SyncCartResult {
  items: { productId: string; quantity: number }[];
}

export class SyncCartUseCase {
  async execute(dto: SyncCartDTO): Promise<SyncCartResult> {
    if (!Array.isArray(dto.items)) {
      throw new AppError('Items debe ser un array.', 400);
    }

    const cart = await CartModel.findOneAndUpdate(
      { userId: dto.userId },
      { $set: { items: dto.items, updatedAt: new Date() } },
      { upsert: true, new: true },
    );

    return { items: cart.items };
  }
}
