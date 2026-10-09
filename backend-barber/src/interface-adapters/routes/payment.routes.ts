import { Router } from 'express';
import { PaymentController } from '../controllers/payment/PaymentController';
import { createAuthenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  paymentIdParamSchema,
  paymentQuerySchema,
  paymentReferenceParamSchema,
  paymentReferenceQuerySchema,
} from '../validators/payment.validator';

export const createPaymentRouter = (deps: {
  paymentController: PaymentController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

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
