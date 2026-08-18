import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PaymentController } from '../controllers/payment/PaymentController';
import { createAuthenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  paymentIdParamSchema,
  paymentPreferenceParamSchema,
  paymentQuerySchema,
  paymentReferenceParamSchema,
  paymentReferenceQuerySchema,
} from '../validators/payment.validator';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes al webhook.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createPaymentRouter = (deps: {
  paymentController: PaymentController;
  authenticate: ReturnType<typeof createAuthenticate>;
  optionalAuth: ReturnType<typeof import('../middlewares/auth.middleware').createOptionalAuth>;
}) => {
  const router = Router();

  router.post(
    '/webhook',
    webhookLimiter,
    deps.paymentController.handleWebhook
  );

  router.get(
    '/by-preference/:preferenceId',
    deps.optionalAuth,
    validate({ params: paymentPreferenceParamSchema }),
    deps.paymentController.getByPreferenceId
  );

  router.get(
    '/by-reference/:referenceId',
    deps.authenticate,
    validate({ params: paymentReferenceParamSchema, query: paymentReferenceQuerySchema }),
    deps.paymentController.getByReference
  );

  router.get(
    '/',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: paymentQuerySchema }),
    deps.paymentController.getAll
  );

  router.get(
    '/:id',
    deps.authenticate,
    validate({ params: paymentIdParamSchema }),
    deps.paymentController.getById
  );

  return router;
};
