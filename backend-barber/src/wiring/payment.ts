import { MongoPaymentRepository } from '../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MercadoPagoService } from '../infrastructure/services/MercadoPagoService';
import { getConfig } from '../infrastructure/config/env';
import { CreatePaymentUseCase } from '../application/use-cases/payment/CreatePaymentUseCase';
import { CreateSubscriptionUseCase } from '../application/use-cases/payment/CreateSubscriptionUseCase';
import { ProcessWebhookUseCase } from '../application/use-cases/payment/ProcessWebhookUseCase';
import { AppointmentPaymentHandler } from '../application/use-cases/payment/handlers/AppointmentPaymentHandler';
import { MembershipPaymentHandler } from '../application/use-cases/payment/handlers/MembershipPaymentHandler';
import { ProductOrderPaymentHandler } from '../application/use-cases/payment/handlers/ProductOrderPaymentHandler';
import { PaymentController } from '../interface-adapters/controllers/payment/PaymentController';
import { createPaymentRouter } from '../interface-adapters/routes/payment.routes';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoOrderRepository } from '../infrastructure/repositories/mongodb/MongoOrderRepository';
import { MongoProductRepository } from '../infrastructure/repositories/mongodb/MongoProductRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { buildTokenService } from './auth';
import { createAuthenticate, createOptionalAuth } from '../interface-adapters/middlewares/auth.middleware';

export const buildPaymentRepository = () => new MongoPaymentRepository();

export const buildMercadoPagoService = () => {
  const config = getConfig();
  return new MercadoPagoService(config.mpAccessToken, config.mpWebhookSecret);
};

export const buildPaymentDependencies = () => {
  const paymentRepository = buildPaymentRepository();
  const mercadoPagoService = buildMercadoPagoService();
  return { paymentRepository, mercadoPagoService };
};

export const buildCreatePaymentUseCase = () => {
  const { paymentRepository, mercadoPagoService } = buildPaymentDependencies();
  return new CreatePaymentUseCase(paymentRepository, mercadoPagoService);
};

export const buildCreateSubscriptionUseCase = () => {
  const { mercadoPagoService } = buildPaymentDependencies();
  return new CreateSubscriptionUseCase(mercadoPagoService);
};

export const buildPaymentRouter = () => {
  const { paymentRepository, mercadoPagoService } = buildPaymentDependencies();
  const appointmentRepository = new MongoAppointmentRepository();
  const membershipRepository = new MongoMembershipRepository();
  const transactionRepository = new MongoMembershipTransactionRepository();
  const orderRepository = new MongoOrderRepository();
  const productRepository = new MongoProductRepository();
  const emailService = new NodemailerEmailService();

  const userRepository = new MongoUserRepository();

  const appointmentHandler = new AppointmentPaymentHandler(appointmentRepository);
  const membershipHandler = new MembershipPaymentHandler(membershipRepository, transactionRepository);
  const productOrderHandler = new ProductOrderPaymentHandler(orderRepository, productRepository, emailService, userRepository);

  const processWebhook = new ProcessWebhookUseCase(
    paymentRepository,
    appointmentHandler,
    membershipHandler,
    productOrderHandler,
    membershipRepository,
    transactionRepository,
    mercadoPagoService,
    emailService,
    userRepository
  );

  const paymentController = new PaymentController(processWebhook, paymentRepository, mercadoPagoService);

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);
  const optionalAuth = createOptionalAuth(tokenService);

  return createPaymentRouter({ paymentController, authenticate, optionalAuth });
};
