import { AuthenticateWithGoogleUseCase } from '../application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { LoginUserUseCase } from '../application/use-cases/auth/LoginUserUseCase';
import { RegisterUserUseCase } from '../application/use-cases/auth/RegisterUserUseCase';
import { SendTwoFactorCodeUseCase } from '../application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../application/use-cases/auth/VerifyTwoFactorUseCase';
import { RequestPasswordResetUseCase } from '../application/use-cases/password/RequestPasswordResetUseCase';
import { ResetPasswordUseCase } from '../application/use-cases/password/ResetPasswordUseCase';
import { MongoPasswordResetRepository } from '../infrastructure/repositories/mongodb/MongoPasswordResetRepository';
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

const parseResetTokenExpirationMin = (value?: string) => {
  if (!value) {
    return 60;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return 60;
  }

  return parsedValue;
};

export const buildAuthRouter = () => {
  const userRepository = new MongoUserRepository();
  const passwordResetRepository = new MongoPasswordResetRepository();
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService();
  const emailService = new NodemailerEmailService();
  const googleAuthService = new GoogleAuthService();
  const randomGenerator = new RandomGenerator();
  const hashService = new HashService();
  const dateTimeProvider = new DateTimeProvider();
  const frontendUrl = process.env.FRONTEND_URL || '';
  const expirationMinutes = parseResetTokenExpirationMin(
    process.env.RESET_TOKEN_EXPIRATION_MIN
  );

  const registerUser = new RegisterUserUseCase(userRepository, passwordHasher);
  const loginUser = new LoginUserUseCase(userRepository, passwordHasher, tokenService);
  const authenticateWithGoogle = new AuthenticateWithGoogleUseCase(
    userRepository,
    googleAuthService,
    tokenService
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
    dateTimeProvider
  );
  const requestPasswordReset = new RequestPasswordResetUseCase(
    userRepository,
    passwordResetRepository,
    emailService,
    randomGenerator,
    hashService,
    dateTimeProvider,
    frontendUrl,
    expirationMinutes
  );
  const resetPassword = new ResetPasswordUseCase(
    userRepository,
    passwordResetRepository,
    passwordHasher,
    hashService
  );

  const authController = new AuthController(registerUser, loginUser);
  const authGoogleController = new AuthGoogleController(authenticateWithGoogle);
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

export const buildTokenService = () => new JwtTokenService();
