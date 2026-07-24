import { Product, type ProductProps } from '../../../domain/entities/Product';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';

export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl?: string;
  gallery?: string[];
  category?: string;
}

export class CreateProductUseCase {
  constructor(
    private readonly productRepository: MongoProductRepository
  ) {}

  async execute(dto: CreateProductDTO): Promise<ProductProps> {
    const product = Product.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock,
      imageUrl: dto.imageUrl || '',
      gallery: dto.gallery,
      category: dto.category || '',
    });

    const saved = await this.productRepository.save(product);
    return saved.toPrimitives();
  }
}
