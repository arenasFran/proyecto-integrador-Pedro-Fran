import { AuthenticateWithGoogleUseCase } from '../application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { CompleteGoogleProfileUseCase } from '../application/use-cases/auth/CompleteGoogleProfileUseCase';
import { RefreshTokenUseCase } from '../application/use-cases/auth/RefreshTokenUseCase';
import { RegisterUserUseCase } from '../application/use-cases/auth/RegisterUserUseCase';
import { SendTwoFactorCodeUseCase } from '../application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../application/use-cases/auth/VerifyTwoFactorUseCase';
import { LogoutUseCase } from '../application/use-cases/auth/LogoutUseCase';
import { RequestPasswordResetUseCase } from '../application/use-cases/password/RequestPasswordResetUseCase';
import { VerifyPasswordResetCodeUseCase } from '../application/use-cases/password/VerifyPasswordResetCodeUseCase';
import { ResetPasswordUseCase } from '../application/use-cases/password/ResetPasswordUseCase';
import { MongoAppointmentRepository } from '../infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoPasswordResetRepository } from '../infrastructure/repositories/mongodb/MongoPasswordResetRepository';
import { MongoRefreshTokenRepository } from '../infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoUserRepository } from '../infrastructure/repositories/mongodb/MongoUserRepository';
import { BcryptPasswordHasher } from '../infrastructure/services/BcryptPasswordHasher';
import { GoogleAuthService } from '../infrastructure/services/GoogleAuthService';
import { HashService } from '../infrastructure/services/HashService';
import { JwtTokenService } from '../infrastructure/services/JwtTokenService';
import { IEmailService } from '../application/ports/IEmailService';
import { NodemailerEmailService } from '../infrastructure/services/NodemailerEmailService';
import { AuthController } from '../interface-adapters/controllers/auth/AuthController';
import { AuthGoogleController } from '../interface-adapters/controllers/auth/AuthGoogleController';
import { PasswordRecoveryController } from '../interface-adapters/controllers/auth/PasswordRecoveryController';
import { TwoFactorController } from '../interface-adapters/controllers/auth/TwoFactorController';
import { createAuthRouter } from '../interface-adapters/routes/auth.routes';
import { getConfig } from '../infrastructure/config/env';

export const buildAuthRouter = (options?: { emailService?: IEmailService }) => {
  const config = getConfig();
  const userRepository = new MongoUserRepository();
  const passwordResetRepository = new MongoPasswordResetRepository();
  const refreshTokenRepository = new MongoRefreshTokenRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService({
    accessSecret: config.jwtAccessSecret,
    refreshSecret: config.jwtRefreshSecret,
    partialSecret: config.jwtPartialSecret,
    accessTokenExpiresIn: config.jwtExpiresIn,
    refreshTokenExpiresIn: config.jwtRefreshExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
  const emailService = options?.emailService ?? new NodemailerEmailService();
  const googleAuthService = new GoogleAuthService(config.googleClientId!);
  const hashService = new HashService();

  const appointmentRepository = new MongoAppointmentRepository();
  const registerUser = new RegisterUserUseCase(userRepository, passwordHasher, appointmentRepository);
  const authenticateWithGoogle = new AuthenticateWithGoogleUseCase(
    userRepository,
    googleAuthService,
    tokenService,
    refreshTokenRepository,
    hashService,
    passwordHasher
  );
  const sendTwoFactorCode = new SendTwoFactorCodeUseCase(
    userRepository,
    passwordHasher,
    emailService,
    hashService
  );
  const verifyTwoFactor = new VerifyTwoFactorUseCase(
    userRepository,
    tokenService,
    hashService,
    refreshTokenRepository
  );
  const requestPasswordReset = new RequestPasswordResetUseCase(
    userRepository,
    passwordResetRepository,
    emailService,
    hashService,
    config.resetTokenExpirationMin
  );
  const refreshTokenUseCase = new RefreshTokenUseCase(
    tokenService,
    refreshTokenRepository,
    hashService
  );
  const completeGoogleProfile = new CompleteGoogleProfileUseCase(
    userRepository,
    tokenService,
    hashService,
    refreshTokenRepository
  );
  const resetPassword = new ResetPasswordUseCase(
    userRepository,
    passwordResetRepository,
    passwordHasher,
    hashService,
    refreshTokenRepository
  );
  const verifyPasswordResetCode = new VerifyPasswordResetCodeUseCase(
    userRepository,
    passwordResetRepository,
    hashService
  );

  const authController = new AuthController(registerUser, refreshTokenUseCase, new LogoutUseCase(hashService, refreshTokenRepository));
  const authGoogleController = new AuthGoogleController(authenticateWithGoogle, completeGoogleProfile);
  const twoFactorController = new TwoFactorController(sendTwoFactorCode, verifyTwoFactor);
  const passwordRecoveryController = new PasswordRecoveryController(
    requestPasswordReset,
    verifyPasswordResetCode,
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
    accessSecret: cfg.jwtAccessSecret,
    refreshSecret: cfg.jwtRefreshSecret,
    partialSecret: cfg.jwtPartialSecret,
    accessTokenExpiresIn: cfg.jwtExpiresIn,
    refreshTokenExpiresIn: cfg.jwtRefreshExpiresIn,
    issuer: cfg.jwtIssuer,
    audience: cfg.jwtAudience,
  });
};
