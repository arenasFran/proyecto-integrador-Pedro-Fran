import { MongoOrderRepository } from '../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../infrastructure/repositories/mongodb/MongoProductRepository';
import { CreateOrderUseCase } from '../application/use-cases/product/CreateOrderUseCase';
import { GetOrderUseCase } from '../application/use-cases/product/GetOrderUseCase';
import { OrderController } from '../interface-adapters/controllers/product/OrderController';
import { createOrderRouter } from '../interface-adapters/routes/order.routes';
import { buildPaymentDependencies } from './payment';
import { CreatePaymentUseCase } from '../application/use-cases/payment/CreatePaymentUseCase';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';

export const buildOrderRouter = () => {
  const orderRepository = new MongoOrderRepository();
  const productRepository = new MongoProductRepository();
  const { paymentRepository, mercadoPagoService } = buildPaymentDependencies();

  const createPaymentUseCase = new CreatePaymentUseCase(paymentRepository, mercadoPagoService);

  const createOrderUseCase = new CreateOrderUseCase(orderRepository, productRepository, createPaymentUseCase);
  const getOrderUseCase = new GetOrderUseCase(orderRepository);

  const orderController = new OrderController(createOrderUseCase, getOrderUseCase, orderRepository);

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createOrderRouter({ orderController, authenticate });
};
