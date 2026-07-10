import mongoose from 'mongoose';
import { ProductModel, IProductDocument } from './models/product.model';
import { Product } from '../../../domain/entities/Product';

type FindAllParams = {
  status?: string;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
};

type FindAllResult = {
  data: Product[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export class MongoProductRepository {
  async findById(id: string): Promise<Product | null> {
    const doc = await ProductModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async findAll(params: FindAllParams = {}): Promise<FindAllResult> {
    const filter: Record<string, unknown> = {};

    if (params.status === 'all') {
      // no status filter — muestra todos (activos, inactivos, etc.)
    } else if (params.status) {
      filter.status = params.status;
    } else {
      filter.status = 'active';
    }

    if (params.category) {
      filter.category = params.category;
    }

    if (params.search) {
      filter.$or = [
        { name: { $regex: params.search, $options: 'i' } },
        { description: { $regex: params.search, $options: 'i' } },
      ];
    }

    const page = params.page || 1;
    const limit = params.limit || 50;
    const skip = (page - 1) * limit;

    const [docs, total] = await Promise.all([
      ProductModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ProductModel.countDocuments(filter),
    ]);

    return {
      data: docs.map((d) => this.toDomain(d)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    };
  }

  async save(product: Product): Promise<Product> {
    const data = product.toPrimitives();

    if (data.id) {
      await ProductModel.findByIdAndUpdate(data.id, {
        $set: {
          name: data.name,
          description: data.description,
          price: data.price,
          stock: data.stock,
          imageUrl: data.imageUrl,
          gallery: data.gallery,
          category: data.category,
          status: data.status,
          updatedAt: new Date(),
        },
      });
      return product;
    }

    const [doc] = await ProductModel.create([{
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      imageUrl: data.imageUrl,
      gallery: data.gallery,
      category: data.category,
      status: data.status,
    }]);

    return Product.restore({
      ...data,
      id: doc._id.toString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  async atomicDecreaseStock(id: string, quantity: number): Promise<boolean> {
    const result = await ProductModel.findOneAndUpdate(
      { _id: id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity }, $set: { updatedAt: new Date() } },
      { new: true }
    );
    return result !== null;
  }

  async atomicIncreaseStock(id: string, quantity: number): Promise<void> {
    await ProductModel.findByIdAndUpdate(id, {
      $inc: { stock: quantity },
      $set: { updatedAt: new Date() },
    });
  }

  async getCategories(): Promise<string[]> {
    return ProductModel.distinct('category', { status: { $ne: 'deleted' } });
  }

  private toDomain(doc: IProductDocument): Product {
    return Product.restore({
      id: doc._id.toString(),
      name: doc.name,
      description: doc.description,
      price: doc.price,
      stock: doc.stock,
      imageUrl: doc.imageUrl,
      gallery: doc.gallery ?? [],
      category: doc.category,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }
}
