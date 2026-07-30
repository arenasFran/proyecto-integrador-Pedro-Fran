import { ProductProps } from '../../../domain/entities/Product';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { AppError } from '../../../domain/errors/AppError';

export interface UpdateProductDTO {
  productId: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
  gallery?: string[];
  category?: string;
  status?: string;
}

export class UpdateProductUseCase {
  constructor(
    private readonly productRepository: MongoProductRepository
  ) {}

  async execute(dto: UpdateProductDTO): Promise<ProductProps> {
    const product = await this.productRepository.findById(dto.productId);
    if (!product) {
      throw new AppError('Producto no encontrado.', 404);
    }

    product.update({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      imageUrl: dto.imageUrl,
      gallery: dto.gallery,
      category: dto.category,
      status: dto.status as any,
    });

    const saved = await this.productRepository.save(product);
    return saved.toPrimitives();
  }
}
