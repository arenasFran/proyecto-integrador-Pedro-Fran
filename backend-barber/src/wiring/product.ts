import { MongoProductRepository } from '../infrastructure/repositories/mongodb/MongoProductRepository';
import { ProductController } from '../interface-adapters/controllers/product/ProductController';
import { createProductRouter } from '../interface-adapters/routes/product.routes';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';

export const buildProductRouter = () => {
  const productRepository = new MongoProductRepository();
  const productController = new ProductController(productRepository);

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createProductRouter({ productController, authenticate });
};
