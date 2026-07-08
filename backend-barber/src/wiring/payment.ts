import { MongoPaymentRepository } from '../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MercadoPagoService } from '../infrastructure/services/MercadoPagoService';
import { getConfig } from '../infrastructure/config/env';
import { CreatePaymentUseCase } from '../application/use-cases/payment/CreatePaymentUseCase';
import { ProcessWebhookUseCase } from '../application/use-cases/payment/ProcessWebhookUseCase';
import { PaymentController } from '../interface-adapters/controllers/payment/PaymentController';
import { createPaymentRouter } from '../interface-adapters/routes/payment.routes';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoOrderRepository } from '../infrastructure/repositories/mongodb/MongoOrderRepository';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';

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

export const buildPaymentRouter = () => {
  const { paymentRepository, mercadoPagoService } = buildPaymentDependencies();
  const appointmentRepository = new MongoAppointmentRepository();
  const membershipRepository = new MongoMembershipRepository();
  const orderRepository = new MongoOrderRepository();

  const processWebhook = new ProcessWebhookUseCase(
    paymentRepository,
    appointmentRepository,
    membershipRepository,
    orderRepository,
    mercadoPagoService
  );

  const paymentController = new PaymentController(processWebhook, paymentRepository);

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createPaymentRouter({ paymentController, authenticate });
};
