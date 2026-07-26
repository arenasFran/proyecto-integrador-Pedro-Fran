import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoPaymentRepository } from '../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { CreateMembershipUseCase } from '../application/use-cases/membership/CreateMembershipUseCase';
import { CancelMembershipUseCase } from '../application/use-cases/membership/CancelMembershipUseCase';
import { InitiateMembershipPaymentUseCase } from '../application/use-cases/membership/InitiateMembershipPaymentUseCase';
import { ApprovePendingMembershipUseCase } from '../application/use-cases/membership/ApprovePendingMembershipUseCase';
import { RetryMembershipPaymentUseCase } from '../application/use-cases/membership/RetryMembershipPaymentUseCase';
import { MongoRevenueEntryRepository } from '../infrastructure/repositories/mongodb/MongoRevenueEntryRepository';
import { RevenueTracker } from '../application/services/RevenueTracker';
import { MembershipResolver } from '../application/services/MembershipResolver';
import { MembershipController } from '../interface-adapters/controllers/membership/MembershipController';
import { createMembershipRouter } from '../interface-adapters/routes/membership.routes';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { buildCreatePaymentUseCase, buildMercadoPagoService } from './payment';

export const buildMembershipRouter = () => {
  const membershipRepo = new MongoMembershipRepository();
  const userRepo = new MongoUserRepository();
  const paymentRepo = new MongoPaymentRepository();
  const transactionRepo = new MongoMembershipTransactionRepository();
  const createPaymentUseCase = buildCreatePaymentUseCase();
  const mercadoPagoService = buildMercadoPagoService();
  const revenueEntryRepository = new MongoRevenueEntryRepository();
  const revenueTracker = new RevenueTracker(revenueEntryRepository);
  const membershipResolver = new MembershipResolver(membershipRepo);
  const createMembershipUseCase = new CreateMembershipUseCase(membershipRepo, userRepo, transactionRepo, paymentRepo, revenueTracker);

  const cancelMembershipUseCase = new CancelMembershipUseCase(membershipRepo, mercadoPagoService);
  const initiateMembershipPaymentUseCase = new InitiateMembershipPaymentUseCase(membershipResolver, userRepo, createPaymentUseCase);
  const approvePendingMembershipUseCase = new ApprovePendingMembershipUseCase(membershipRepo, transactionRepo);
  const retryMembershipPaymentUseCase = new RetryMembershipPaymentUseCase(membershipRepo, userRepo, createPaymentUseCase, paymentRepo);

  const controller = new MembershipController(
    membershipRepo,
    userRepo,
    transactionRepo,
    createPaymentUseCase,
    paymentRepo,
    mercadoPagoService,
    createMembershipUseCase,
    cancelMembershipUseCase,
    initiateMembershipPaymentUseCase,
    approvePendingMembershipUseCase,
    retryMembershipPaymentUseCase,
  );

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createMembershipRouter({ membershipController: controller, authenticate });
};
