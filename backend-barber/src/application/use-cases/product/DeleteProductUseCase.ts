import { ProductProps } from '../../../domain/entities/Product';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { AppError } from '../../../domain/errors/AppError';

export interface DeleteProductDTO {
  productId: string;
}

export class DeleteProductUseCase {
  constructor(
    private readonly productRepository: MongoProductRepository
  ) {}

  async execute(dto: DeleteProductDTO): Promise<ProductProps> {
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      throw new AppError('Producto no encontrado.', 404);
    }

    product.delete();
    await this.productRepository.save(product);

    return product.toPrimitives();
  }
}
