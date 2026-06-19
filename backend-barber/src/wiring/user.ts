import { GetCurrentUserUseCase } from '../application/use-cases/user/GetCurrentUserUseCase';
import { UpdateUserUseCase } from '../application/use-cases/user/UpdateUserUseCase';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { JwtTokenService } from '../infrastructure/services/JwtTokenService';
import { BcryptPasswordHasher } from '../infrastructure/services/BcryptPasswordHasher';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { UserController } from '../interface-adapters/controllers/user/UserController';
import { createUserRouter } from '../interface-adapters/routes/user.routes';
import { getConfig } from '../infrastructure/config/env';

export const buildUserRouter = () => {
  const config = getConfig();
  const userRepository = new MongoUserRepository();
  const tokenService = new JwtTokenService({
    accessSecret: config.jwtAccessSecret,
    refreshSecret: config.jwtRefreshSecret,
    partialSecret: config.jwtPartialSecret,
    accessTokenExpiresIn: config.jwtExpiresIn,
    refreshTokenExpiresIn: config.jwtRefreshExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
  const passwordHasher = new BcryptPasswordHasher();

  const getCurrentUser = new GetCurrentUserUseCase(userRepository);
  const updateUser = new UpdateUserUseCase(userRepository, passwordHasher);
  const userController = new UserController(getCurrentUser, updateUser);
  const authenticate = createAuthenticate(tokenService);

  return createUserRouter({ authenticate, userController });
};
