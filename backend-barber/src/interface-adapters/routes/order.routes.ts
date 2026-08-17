import { Router } from 'express';
import { OrderController } from '../controllers/product/OrderController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  createOrderSchema,
  createManualOrderSchema,
  orderIdParamSchema,
  queryOrdersSchema,
  updateOrderStatusSchema,
} from '../validators/order.validator';

export const createOrderRouter = (deps: {
  orderController: OrderController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.post(
    '/',
    deps.authenticate,
    authorize('Registrado'),
    validate({ body: createOrderSchema }),
    deps.orderController.create
  );

  router.post(
    '/manual',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ body: createManualOrderSchema }),
    deps.orderController.createManual
  );

  router.get(
    '/me',
    deps.authenticate,
    deps.orderController.getMyOrders
  );

  router.get(
    '/',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ query: queryOrdersSchema }),
    deps.orderController.getAll
  );

  router.patch(
    '/:id/status',
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ params: orderIdParamSchema, body: updateOrderStatusSchema }),
    deps.orderController.updateStatus
  );

  router.delete(
    '/:id',
    deps.authenticate,
    authorize('Admin'),
    validate({ params: orderIdParamSchema }),
    deps.orderController.delete
  );

  router.get(
    '/:id',
    deps.authenticate,
    validate({ params: orderIdParamSchema }),
    deps.orderController.getById
  );

  return router;
};
