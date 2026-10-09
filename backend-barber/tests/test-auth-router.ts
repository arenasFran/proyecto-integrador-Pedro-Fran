import express from 'express';
import { AuthenticateWithGoogleUseCase } from '../src/application/use-cases/auth/AuthenticateWithGoogleUseCase';
import { CompleteGoogleProfileUseCase } from '../src/application/use-cases/auth/CompleteGoogleProfileUseCase';
import { RefreshTokenUseCase } from '../src/application/use-cases/auth/RefreshTokenUseCase';
import { RegisterUserUseCase } from '../src/application/use-cases/auth/RegisterUserUseCase';
import { SendTwoFactorCodeUseCase } from '../src/application/use-cases/auth/SendTwoFactorCodeUseCase';
import { VerifyTwoFactorUseCase } from '../src/application/use-cases/auth/VerifyTwoFactorUseCase';
import { LogoutUseCase } from '../src/application/use-cases/auth/LogoutUseCase';
import { RequestPasswordResetUseCase } from '../src/application/use-cases/password/RequestPasswordResetUseCase';
import { VerifyPasswordResetCodeUseCase } from '../src/application/use-cases/password/VerifyPasswordResetCodeUseCase';
import { ResetPasswordUseCase } from '../src/application/use-cases/password/ResetPasswordUseCase';
import { MongoAppointmentRepository } from '../src/infrastructure/repositories/mongodb/MongoAppointmentRepository';
import { MongoPasswordResetRepository } from '../src/infrastructure/repositories/mongodb/MongoPasswordResetRepository';
import { MongoRefreshTokenRepository } from '../src/infrastructure/repositories/mongodb/MongoRefreshTokenRepository';
import { MongoUserRepository } from '../src/infrastructure/repositories/mongodb/MongoUserRepository';
import { BcryptPasswordHasher } from '../src/infrastructure/services/BcryptPasswordHasher';
import { GoogleAuthService } from '../src/infrastructure/services/GoogleAuthService';
import { HashService } from '../src/infrastructure/services/HashService';
import { JwtTokenService } from '../src/infrastructure/services/JwtTokenService';
import { NodemailerEmailService } from '../src/infrastructure/services/NodemailerEmailService';
import { IEmailService } from '../src/application/ports/IEmailService';
import { AuthController } from '../src/interface-adapters/controllers/auth/AuthController';
import { AuthGoogleController } from '../src/interface-adapters/controllers/auth/AuthGoogleController';
import { PasswordRecoveryController } from '../src/interface-adapters/controllers/auth/PasswordRecoveryController';
import { TwoFactorController } from '../src/interface-adapters/controllers/auth/TwoFactorController';
import { validate } from '../src/interface-adapters/middlewares/validation.middleware';
import {
  completeGoogleProfileSchema,
  googleLoginSchema,
  refreshTokenSchema,
  registerSchema,
  twoFactorSendSchema,
  twoFactorVerifySchema,
} from '../src/interface-adapters/validators/auth.validator';
import {
  requestResetSchema,
  verifyResetCodeSchema,
  resetPasswordSchema,
} from '../src/interface-adapters/validators/recovery.validator';
import { getConfig } from '../src/infrastructure/config/env';

export const buildTestAuthRouter = (options?: { emailService?: IEmailService }) => {
  const config = getConfig();
  const router = express.Router({ mergeParams: true });

  const validateRefreshBody: express.RequestHandler = (req, res, next) => {
    if (!req.body || Object.keys(req.body).length === 0) return next();

    const { error, value } = refreshTokenSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({ error: error.details.map((detail) => detail.message).join(', ') });
    }
    req.body = value;
    next();
  };

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

  router.post('/register', validate({ body: registerSchema }), authController.register);
  router.post('/google', validate({ body: googleLoginSchema }), authGoogleController.googleLogin);
  router.post(
    '/google/complete-profile',
    validate({ body: completeGoogleProfileSchema }),
    authGoogleController.completeProfile
  );
  router.post('/refresh', validateRefreshBody, authController.refresh);
  router.post('/logout', authController.logout);
  router.post(
    '/2fa/send',
    validate({ body: twoFactorSendSchema }),
    twoFactorController.sendTwoFactorCode
  );
  router.post(
    '/2fa/verify',
    validate({ body: twoFactorVerifySchema }),
    twoFactorController.verifyTwoFactorCode
  );
  router.post(
    '/request-reset',
    validate({ body: requestResetSchema }),
    passwordRecoveryController.requestReset
  );
  router.post(
    '/verify-reset-code',
    validate({ body: verifyResetCodeSchema }),
    passwordRecoveryController.verifyCode
  );
  router.post(
    '/reset-password',
    validate({ body: resetPasswordSchema }),
    passwordRecoveryController.resetPassword
  );

  return router;
};