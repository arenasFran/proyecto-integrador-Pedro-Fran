import { Request, Response } from 'express';
import { MongoProductRepository } from '../../../infrastructure/repositories/mongodb/MongoProductRepository';
import { CreateProductUseCase } from '../../../application/use-cases/product/CreateProductUseCase';
import { UpdateProductUseCase } from '../../../application/use-cases/product/UpdateProductUseCase';
import { DeleteProductUseCase } from '../../../application/use-cases/product/DeleteProductUseCase';
import { Product } from '../../../domain/entities/Product';
import { sendSuccess, sendError } from '../../../common/response';
import { AppError } from '../../../domain/errors/AppError';

export class ProductController {
  constructor(
    private readonly productRepository: MongoProductRepository,
    private readonly createProductUseCase: CreateProductUseCase,
    private readonly updateProductUseCase: UpdateProductUseCase,
    private readonly deleteProductUseCase: DeleteProductUseCase
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

  getPublicCatalog = async (req: Request, res: Response) => {
    try {
      const { category, search, page, limit } = req.query as Record<string, string>;
      const result = await this.productRepository.findPublicCatalog({
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
      return sendError(res, error, 'Error al listar el catálogo público');
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
      const { name, description, price, stock, imageUrl, gallery, category } = req.body;

      const result = await this.createProductUseCase.execute({
        name,
        description,
        price,
        stock,
        imageUrl: imageUrl || '',
        gallery,
        category: category || '',
      });

      return sendSuccess(res, { product: result }, 201);
    } catch (error) {
      return sendError(res, error, 'Error al crear producto');
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { name, description, price, stock, imageUrl, gallery, category, status } = req.body;

      const result = await this.updateProductUseCase.execute({
        productId: req.params.id as string,
        name,
        description,
        price,
        stock,
        imageUrl,
        gallery,
        category,
        status,
      });

      return sendSuccess(res, { product: result });
    } catch (error) {
      return sendError(res, error, 'Error al actualizar producto');
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      await this.deleteProductUseCase.execute({ productId: req.params.id as string });
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
