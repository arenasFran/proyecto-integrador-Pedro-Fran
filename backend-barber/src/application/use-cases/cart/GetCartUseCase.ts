import { CartModel } from '../../../infrastructure/repositories/mongodb/models/cart.model';

export interface GetCartDTO {
  userId: string;
}

export interface GetCartResult {
  items: { productId: string; quantity: number }[];
}

export class GetCartUseCase {
  async execute(dto: GetCartDTO): Promise<GetCartResult> {
    const cart = await CartModel.findOne({ userId: dto.userId });
    return { items: cart?.items ?? [] };
  }
}
