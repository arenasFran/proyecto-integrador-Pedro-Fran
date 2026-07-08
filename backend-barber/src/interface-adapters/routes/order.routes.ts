import { Router } from 'express';
import { OrderController } from '../controllers/product/OrderController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  createOrderSchema,
  orderIdParamSchema,
  queryOrdersSchema,
} from '../validators/order.validator';

export const createOrderRouter = (deps: {
  orderController: OrderController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.post(
    '/',
    deps.authenticate,
    validate({ body: createOrderSchema }),
    deps.orderController.create
  );

  router.get(
    '/me',
    deps.authenticate,
    deps.orderController.getMyOrders
  );

  router.get(
    '/',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: queryOrdersSchema }),
    deps.orderController.getAll
  );

  router.get(
    '/:id',
    deps.authenticate,
    validate({ params: orderIdParamSchema }),
    deps.orderController.getById
  );

  return router;
};
