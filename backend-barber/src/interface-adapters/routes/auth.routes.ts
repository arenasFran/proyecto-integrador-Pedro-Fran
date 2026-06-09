import Joi from 'joi';
import express from 'express';
import { AuthController } from '../controllers/auth/AuthController';
import { AuthGoogleController } from '../controllers/auth/AuthGoogleController';
import { PasswordRecoveryController } from '../controllers/auth/PasswordRecoveryController';
import { TwoFactorController } from '../controllers/auth/TwoFactorController';
import { validate } from '../middlewares/validation.middleware';
import {
    completeGoogleProfileSchema,
    googleLoginSchema,
    refreshTokenSchema,
    registerSchema,
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

  router.post('/register', validate({ body: registerSchema }), deps.authController.register);
  router.post('/google', validate({ body: googleLoginSchema }), deps.authGoogleController.googleLogin);
  router.post(
    '/google/complete-profile',
    validate({ body: completeGoogleProfileSchema }),
    deps.authGoogleController.completeProfile
  );

  router.post(
    '/refresh',
    validate({ body: refreshTokenSchema }),
    deps.authController.refresh
  );

  router.post(
    '/2fa/send',
    validate({ body: twoFactorSendSchema }),
    deps.twoFactorController.sendTwoFactorCode
  );
  router.post(
    '/2fa/verify',
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
