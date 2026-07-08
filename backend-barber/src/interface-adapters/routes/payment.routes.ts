import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PaymentController } from '../controllers/payment/PaymentController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { paymentIdParamSchema } from '../validators/payment.validator';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas solicitudes al webhook.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createPaymentRouter = (deps: {
  paymentController: PaymentController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.post(
    '/webhook',
    webhookLimiter,
    deps.paymentController.handleWebhook
  );

  router.get(
    '/:id',
    deps.authenticate,
    validate({ params: paymentIdParamSchema }),
    deps.paymentController.getById
  );

  return router;
};
