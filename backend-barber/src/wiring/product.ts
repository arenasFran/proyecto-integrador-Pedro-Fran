import { MongoProductRepository } from '../infrastructure/repositories/mongodb/MongoProductRepository';
import { CreateProductUseCase } from '../application/use-cases/product/CreateProductUseCase';
import { UpdateProductUseCase } from '../application/use-cases/product/UpdateProductUseCase';
import { DeleteProductUseCase } from '../application/use-cases/product/DeleteProductUseCase';
import { ProductController } from '../interface-adapters/controllers/product/ProductController';
import { createProductRouter } from '../interface-adapters/routes/product.routes';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';

export const buildProductRouter = () => {
  const productRepository = new MongoProductRepository();
  const createProductUseCase = new CreateProductUseCase(productRepository);
  const updateProductUseCase = new UpdateProductUseCase(productRepository);
  const deleteProductUseCase = new DeleteProductUseCase(productRepository);
  const productController = new ProductController(
    productRepository,
    createProductUseCase,
    updateProductUseCase,
    deleteProductUseCase,
  );

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createProductRouter({ productController, authenticate });
};
