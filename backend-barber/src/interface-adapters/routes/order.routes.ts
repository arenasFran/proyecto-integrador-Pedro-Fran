import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { OrderController } from '../controllers/product/OrderController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { getConfig } from '../../infrastructure/config/env';
import {
  createOrderSchema,
  createManualOrderSchema,
  orderIdParamSchema,
  queryOrdersSchema,
  updateOrderStatusSchema,
} from '../validators/order.validator';

const config = getConfig();
const orderMutationLimiter = rateLimit({
  windowMs: config.rateLimit.order.windowMs,
  max: config.rateLimit.order.max,
  message: { error: 'Demasiadas solicitudes de órdenes. Esperá un momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createOrderRouter = (deps: {
  orderController: OrderController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.post(
    '/',
    orderMutationLimiter,
    deps.authenticate,
    validate({ body: createOrderSchema }),
    deps.orderController.create
  );

  router.post(
    '/manual',
    orderMutationLimiter,
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
