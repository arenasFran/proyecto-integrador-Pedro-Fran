import { MongoOrderRepository } from '../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../infrastructure/repositories/mongodb/MongoProductRepository';
import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { CreateOrderUseCase } from '../application/use-cases/product/CreateOrderUseCase';
import { GetOrderUseCase } from '../application/use-cases/product/GetOrderUseCase';
import { UpdateOrderStatusUseCase } from '../application/use-cases/product/UpdateOrderStatusUseCase';
import { CreateManualOrderUseCase } from '../application/use-cases/product/CreateManualOrderUseCase';
import { DeleteOrderUseCase } from '../application/use-cases/product/DeleteOrderUseCase';
import { OrderController } from '../interface-adapters/controllers/product/OrderController';
import { createOrderRouter } from '../interface-adapters/routes/order.routes';
import { buildPaymentDependencies } from './payment';
import { CreatePaymentUseCase } from '../application/use-cases/payment/CreatePaymentUseCase';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';

export const buildOrderRouter = () => {
  const orderRepository = new MongoOrderRepository();
  const productRepository = new MongoProductRepository();
  const membershipRepository = new MongoMembershipRepository();
  const { paymentRepository, mercadoPagoService } = buildPaymentDependencies();

  const createPaymentUseCase = new CreatePaymentUseCase(paymentRepository, mercadoPagoService);

  const createOrderUseCase = new CreateOrderUseCase(orderRepository, productRepository, membershipRepository, createPaymentUseCase, paymentRepository);
  const getOrderUseCase = new GetOrderUseCase(orderRepository);
  const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepository, productRepository, paymentRepository);
  const createManualOrderUseCase = new CreateManualOrderUseCase(orderRepository, productRepository, paymentRepository);
  const deleteOrderUseCase = new DeleteOrderUseCase(orderRepository, productRepository);

  const emailService = new NodemailerEmailService();
  const userRepository = new MongoUserRepository();
  const orderController = new OrderController(
    createOrderUseCase,
    getOrderUseCase,
    updateOrderStatusUseCase,
    createManualOrderUseCase,
    deleteOrderUseCase,
    orderRepository,
    productRepository,
    emailService,
    userRepository,
  );

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createOrderRouter({ orderController, authenticate });
};
