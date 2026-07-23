import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoPaymentRepository } from '../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { MembershipController } from '../interface-adapters/controllers/membership/MembershipController';
import { createMembershipRouter } from '../interface-adapters/routes/membership.routes';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { buildCreatePaymentUseCase, buildCreateSubscriptionUseCase, buildMercadoPagoService } from './payment';

export const buildMembershipRouter = () => {
  const membershipRepo = new MongoMembershipRepository();
  const userRepo = new MongoUserRepository();
  const paymentRepo = new MongoPaymentRepository();
  const transactionRepo = new MongoMembershipTransactionRepository();
  const createPaymentUseCase = buildCreatePaymentUseCase();
  const createSubscriptionUseCase = buildCreateSubscriptionUseCase();
  const mercadoPagoService = buildMercadoPagoService();
  const controller = new MembershipController(
    membershipRepo,
    userRepo,
    transactionRepo,
    createPaymentUseCase,
    paymentRepo,
    createSubscriptionUseCase,
    mercadoPagoService
  );

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createMembershipRouter({ membershipController: controller, authenticate });
};
