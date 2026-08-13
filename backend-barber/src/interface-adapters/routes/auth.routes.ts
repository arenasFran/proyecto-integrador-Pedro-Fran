import Joi from 'joi';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth/AuthController';
import { AuthGoogleController } from '../controllers/auth/AuthGoogleController';
import { PasswordRecoveryController } from '../controllers/auth/PasswordRecoveryController';
import { TwoFactorController } from '../controllers/auth/TwoFactorController';
import { validate } from '../middlewares/validation.middleware';
import {
    completeGoogleProfileSchema,
    googleLoginSchema,
    registerSchema,
    refreshTokenSchema,
    twoFactorSendSchema,
    twoFactorVerifySchema,
} from '../validators/auth.validator';
import {
    requestResetSchema,
    resetPasswordSchema,
} from '../validators/recovery.validator';

export const createAuthRouter = (deps: {
  authController: AuthController;
  authGoogleController: AuthGoogleController;
  twoFactorController: TwoFactorController;
  passwordRecoveryController: PasswordRecoveryController;
}) => {
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

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Demasiados intentos de login, esperá 15 minutos" },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const twoFactorLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Demasiados intentos de verificación, esperá 15 minutos' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  router.post('/register', validate({ body: registerSchema }), deps.authController.register);
  router.post('/google', validate({ body: googleLoginSchema }), deps.authGoogleController.googleLogin);
  router.post(
    '/google/complete-profile',
    validate({ body: completeGoogleProfileSchema }),
    deps.authGoogleController.completeProfile
  );

  router.post(
    '/refresh',
    validateRefreshBody,
    deps.authController.refresh
  );

  router.post(
    '/logout',
    deps.authController.logout
  );

  router.post(
    '/2fa/send',
    loginLimiter,
    validate({ body: twoFactorSendSchema }),
    deps.twoFactorController.sendTwoFactorCode
  );
  router.post(
    '/2fa/verify',
    twoFactorLimiter,
    validate({ body: twoFactorVerifySchema }),
    deps.twoFactorController.verifyTwoFactorCode
  );

  router.post(
    '/request-reset',
    validate({ body: requestResetSchema }),
    deps.passwordRecoveryController.requestReset
  );
  router.post(
    '/reset-password',
    validate({ body: resetPasswordSchema }),
    deps.passwordRecoveryController.resetPassword
  );

  return router;
};
