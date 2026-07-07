import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { MembershipController } from '../interface-adapters/controllers/membership/MembershipController';
import { createMembershipRouter } from '../interface-adapters/routes/membership.routes';
import { buildTokenService } from './auth';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';

export const buildMembershipRouter = () => {
  const membershipRepo = new MongoMembershipRepository();
  const userRepo = new MongoUserRepository();
  const controller = new MembershipController(membershipRepo, userRepo);

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createMembershipRouter({ membershipController: controller, authenticate });
};
