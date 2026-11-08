import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoMembershipTransactionRepository } from '../infrastructure/repositories/mongodb/MongoMembershipTransactionRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { MongoPaymentRepository } from '../infrastructure/repositories/mongodb/MongoPaymentRepository';
import { CreateMembershipUseCase } from '../application/use-cases/membership/CreateMembershipUseCase';
import { CancelMembershipUseCase } from '../application/use-cases/membership/CancelMembershipUseCase';
import { ApprovePendingMembershipUseCase } from '../application/use-cases/membership/ApprovePendingMembershipUseCase';
import { MongoRevenueEntryRepository } from '../infrastructure/repositories/mongodb/MongoRevenueEntryRepository';
import { RevenueTracker } from '../application/services/RevenueTracker';
import { MembershipResolver } from '../application/services/MembershipResolver';
import { MembershipController } from '../interface-adapters/controllers/membership/MembershipController';
import { createMembershipRouter } from '../interface-adapters/routes/membership.routes';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';

export const buildMembershipRouter = () => {
  const membershipRepo = new MongoMembershipRepository();
  const userRepo = new MongoUserRepository();
  const paymentRepo = new MongoPaymentRepository();
  const transactionRepo = new MongoMembershipTransactionRepository();
  const revenueEntryRepository = new MongoRevenueEntryRepository();
  const revenueTracker = new RevenueTracker(revenueEntryRepository);
  const membershipResolver = new MembershipResolver(membershipRepo);
  const createMembershipUseCase = new CreateMembershipUseCase(membershipRepo, userRepo, transactionRepo, paymentRepo, revenueTracker);

  const cancelMembershipUseCase = new CancelMembershipUseCase(membershipRepo);
  const approvePendingMembershipUseCase = new ApprovePendingMembershipUseCase(membershipRepo, transactionRepo, paymentRepo, revenueTracker);

  const controller = new MembershipController(
    membershipRepo,
    userRepo,
    transactionRepo,
    createMembershipUseCase,
    cancelMembershipUseCase,
    approvePendingMembershipUseCase,
    membershipResolver,
  );

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createMembershipRouter({ membershipController: controller, authenticate });
};
