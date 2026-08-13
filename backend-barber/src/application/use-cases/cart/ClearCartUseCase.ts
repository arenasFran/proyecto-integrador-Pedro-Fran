import { CartModel } from '../../../infrastructure/repositories/mongodb/models/cart.model';

export interface ClearCartDTO {
  userId: string;
}

export class ClearCartUseCase {
  async execute(dto: ClearCartDTO): Promise<void> {
    await CartModel.findOneAndUpdate(
      { userId: dto.userId },
      { $set: { items: [], updatedAt: new Date() } },
    );
  }
}
