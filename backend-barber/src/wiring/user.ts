import { GetCurrentUserUseCase } from '../application/use-cases/user/GetCurrentUserUseCase';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { JwtTokenService } from '../infrastructure/services/JwtTokenService';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { UserController } from '../interface-adapters/controllers/user/UserController';
import { createUserRouter } from '../interface-adapters/routes/user.routes';
import { getConfig } from '../infrastructure/config/env';

export const buildUserRouter = () => {
  const config = getConfig();
  const userRepository = new MongoUserRepository();
  const tokenService = new JwtTokenService({
    secret: config.jwtSecret,
    accessTokenExpiresIn: config.jwtExpiresIn,
    refreshTokenExpiresIn: config.jwtRefreshExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });

  const getCurrentUser = new GetCurrentUserUseCase(userRepository);
  const userController = new UserController(getCurrentUser);
  const authenticate = createAuthenticate(tokenService);

  return createUserRouter({ authenticate, userController });
};
