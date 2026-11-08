import { MongoPaymentRepository } from '../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { PaymentController } from '../interface-adapters/controllers/payment/PaymentController';
import { createPaymentRouter } from '../interface-adapters/routes/payment.routes';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';

export const buildPaymentRepository = () => new MongoPaymentRepository();

export const buildPaymentRouter = () => {
  const paymentRepository = buildPaymentRepository();
  const paymentController = new PaymentController(paymentRepository);

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);
  return createPaymentRouter({ paymentController, authenticate });
};
