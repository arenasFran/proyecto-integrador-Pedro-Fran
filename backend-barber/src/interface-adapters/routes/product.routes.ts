import { Router } from 'express';
import { ProductController } from '../controllers/product/ProductController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  queryProductsSchema,
} from '../validators/product.validator';

export const createProductRouter = (deps: {
  productController: ProductController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.get(
    '/',
    validate({ query: queryProductsSchema }),
    deps.productController.getAll
  );

  router.get(
    '/categories',
    deps.productController.getCategories
  );

  router.get(
    '/catalog',
    validate({ query: queryProductsSchema }),
    deps.productController.getPublicCatalog
  );

  router.get(
    '/:id',
    validate({ params: productIdParamSchema }),
    deps.productController.getById
  );

  router.post(
    '/',
    deps.authenticate,
    authorize('Admin'),
    validate({ body: createProductSchema }),
    deps.productController.create
  );

  router.put(
    '/:id',
    deps.authenticate,
    authorize('Admin'),
    validate({ params: productIdParamSchema, body: updateProductSchema }),
    deps.productController.update
  );

  router.delete(
    '/:id',
    deps.authenticate,
    authorize('Admin'),
    validate({ params: productIdParamSchema }),
    deps.productController.delete
  );

  return router;
};
