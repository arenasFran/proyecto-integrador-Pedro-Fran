import { Request, Response } from 'express';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { Product } from '../../../domain/entities/Product';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class ProductController {
  constructor(
    private readonly productRepository: MongoProductRepository
  ) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const { status, category, search, page, limit } = req.query as Record<string, string>;

      const result = await this.productRepository.findAll({
        status,
        category,
        search,
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return sendSuccess(res, {
        products: result.data.map((p) => p.toPrimitives()),
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.limit,
      });
    } catch (error) {
      return sendError(res, error, 'Error al listar productos');
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const product = await this.productRepository.findById(req.params.id as string);
      if (!product) {
        throw new AppError('Producto no encontrado.', 404);
      }
      return sendSuccess(res, { product: product.toPrimitives() });
    } catch (error) {
      return sendError(res, error, 'Error al obtener producto');
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name, description, price, stock, imageUrl, category } = req.body;

      const product = Product.create({ name, description, price, stock, imageUrl: imageUrl || '', category: category || '' });

      const saved = await this.productRepository.save(product);

      return sendSuccess(res, { product: saved.toPrimitives() }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear producto');
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const product = await this.productRepository.findById(req.params.id as string);
      if (!product) {
        throw new AppError('Producto no encontrado.', 404);
      }

      const { name, description, price, stock, imageUrl, category, status } = req.body;
      product.update({ name, description, price, stock, imageUrl, category, status });

      const saved = await this.productRepository.save(product);

      return sendSuccess(res, { product: saved.toPrimitives() });
    } catch (error) {
      return sendError(res, error, 'Error al actualizar producto');
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const product = await this.productRepository.findById(req.params.id as string);
      if (!product) {
        throw new AppError('Producto no encontrado.', 404);
      }

      product.delete();
      await this.productRepository.save(product);

      return sendSuccess(res, { message: 'Producto eliminado correctamente.' });
    } catch (error) {
      return sendError(res, error, 'Error al eliminar producto');
    }
  };

  getCategories = async (_req: Request, res: Response) => {
    try {
      const categories = await this.productRepository.getCategories();
      return sendSuccess(res, { categories });
    } catch (error) {
      return sendError(res, error, 'Error al obtener categorías');
    }
  };
}
