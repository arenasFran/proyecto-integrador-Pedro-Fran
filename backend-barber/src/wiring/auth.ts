import { AuthenticateWithGoogleUseCase } from '../application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { CompleteGoogleProfileUseCase } from '../application/use-cases/auth/CompleteGoogleProfileUseCase';
import { LoginUserUseCase } from '../application/use-cases/auth/LoginUserUseCase';
import { RefreshTokenUseCase } from '../application/use-cases/auth/RefreshTokenUseCase';
import { RegisterUserUseCase } from '../application/use-cases/auth/RegisterUserUseCase';
import { SendTwoFactorCodeUseCase } from '../application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../application/use-cases/auth/VerifyTwoFactorUseCase';
import { RequestPasswordResetUseCase } from '../application/use-cases/password/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../application/use-cases/password/ResetPasswordUseCase';
import { MongoPasswordResetRepository } from '../infrastructure/repositories/mongodb/MongoPasswordResetRepository';
import { MongoRefreshTokenRepository } from '../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { BcryptPasswordHasher } from '../infrastructure/services/BcryptPasswordHasher';
import { DateTimeProvider } from '../infrastructure/services/DateTimeProvider';
import { GoogleAuthService } from '../infrastructure/services/GoogleAuthService';
import { HashService } from '../infrastructure/services/HashService';
import { JwtTokenService } from '../infrastructure/services/JwtTokenService';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { RandomGenerator } from '../infrastructure/services/RandomGenerator';
import { AuthController } from '../interface-adapters/controllers/auth/AuthController';
import { AuthGoogleController } from '../interface-adapters/controllers/auth/AuthGoogleController';
import { PasswordRecoveryController } from '../interface-adapters/controllers/auth/PasswordRecoveryController';
import { TwoFactorController } from '../interface-adapters/controllers/auth/TwoFactorController';
import { createAuthRouter } from '../interface-adapters/routes/auth.routes';
import { getConfig } from '../infrastructure/config/env';

export const buildAuthRouter = () => {
  const config = getConfig();
  const userRepository = new MongoUserRepository();
  const passwordResetRepository = new MongoPasswordResetRepository();
  const refreshTokenRepository = new MongoRefreshTokenRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService({
    secret: config.jwtSecret,
    accessTokenExpiresIn: config.jwtExpiresIn,
    refreshTokenExpiresIn: config.jwtRefreshExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
  const emailService = new NodemailerEmailService();
  const googleAuthService = new GoogleAuthService();
  const randomGenerator = new RandomGenerator();
  const hashService = new HashService();
  const dateTimeProvider = new DateTimeProvider();

  const registerUser = new RegisterUserUseCase(userRepository, passwordHasher);
  const loginUser = new LoginUserUseCase(
    userRepository,
    passwordHasher,
    emailService,
    randomGenerator,
    hashService,
    dateTimeProvider
  );
  const authenticateWithGoogle = new AuthenticateWithGoogleUseCase(
    userRepository,
    googleAuthService,
    tokenService,
    refreshTokenRepository,
    hashService,
    dateTimeProvider,
    passwordHasher
  );
  const sendTwoFactorCode = new SendTwoFactorCodeUseCase(
    userRepository,
    passwordHasher,
    emailService,
    randomGenerator,
    hashService,
    dateTimeProvider
  );
  const verifyTwoFactor = new VerifyTwoFactorUseCase(
    userRepository,
    tokenService,
    hashService,
    dateTimeProvider,
    refreshTokenRepository
  );
  const requestPasswordReset = new RequestPasswordResetUseCase(
    userRepository,
    passwordResetRepository,
    emailService,
    randomGenerator,
    hashService,
    dateTimeProvider,
    config.frontendUrl,
    config.resetTokenExpirationMin
  );
  const refreshTokenUseCase = new RefreshTokenUseCase(
    tokenService,
    refreshTokenRepository,
    hashService,
    dateTimeProvider
  );
  const completeGoogleProfile = new CompleteGoogleProfileUseCase(
    userRepository,
    tokenService,
    hashService,
    dateTimeProvider,
    refreshTokenRepository
  );
  const resetPassword = new ResetPasswordUseCase(
    userRepository,
    passwordResetRepository,
    passwordHasher,
    hashService
  );

  const authController = new AuthController(registerUser, loginUser, refreshTokenUseCase);
  const authGoogleController = new AuthGoogleController(authenticateWithGoogle, completeGoogleProfile);
  const twoFactorController = new TwoFactorController(sendTwoFactorCode, verifyTwoFactor);
  const passwordRecoveryController = new PasswordRecoveryController(
    requestPasswordReset,
    resetPassword
  );

  return createAuthRouter({
    authController,
    authGoogleController,
    twoFactorController,
    passwordRecoveryController,
  });
};

export const buildTokenService = () => {
  const cfg = getConfig();
  return new JwtTokenService({
    secret: cfg.jwtSecret,
    accessTokenExpiresIn: cfg.jwtExpiresIn,
    refreshTokenExpiresIn: cfg.jwtRefreshExpiresIn,
    issuer: cfg.jwtIssuer,
    audience: cfg.jwtAudience,
  });
};
