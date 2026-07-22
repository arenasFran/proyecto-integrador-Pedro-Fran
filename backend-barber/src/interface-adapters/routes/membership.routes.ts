import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { MembershipController } from '../controllers/membership/MembershipController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { authorize } from '../middlewares/auth.middleware';
import {
  createMembershipSchema,
  redeemCouponSchema,
  queryMembershipsSchema,
  initiateMembershipPaymentSchema,
  createSubscriptionSchema,
  membershipIdParamSchema,
  membershipUserIdParamSchema,
} from '../validators/membership.validator';

const membershipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Demasiadas solicitudes. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const membershipMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Demasiadas solicitudes. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createMembershipRouter = (deps: {
  membershipController: MembershipController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.get(
    '/mine',
    deps.authenticate,
    deps.membershipController.getMyMembership
  );

  router.post(
    '/',
    membershipMutationLimiter,
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ body: createMembershipSchema }),
    deps.membershipController.create
  );

  router.get(
    '/',
    membershipLimiter,
    deps.authenticate,
    authorize('Admin'),
    validate({ query: queryMembershipsSchema }),
    deps.membershipController.getAll
  );

  router.get(
    '/transactions',
    membershipLimiter,
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    deps.membershipController.getTransactions
  );

  router.get(
    '/pending',
    membershipLimiter,
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    deps.membershipController.getPending
  );

  router.get(
    '/expiring-soon',
    membershipLimiter,
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    deps.membershipController.getExpiringSoon
  );

  router.get(
    '/user/:userId',
    membershipLimiter,
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ params: membershipUserIdParamSchema }),
    deps.membershipController.getByUserId
  );

  router.get(
    '/:id',
    deps.authenticate,
    authorize('Admin'),
    deps.membershipController.getById
  );

  router.post(
    '/create-subscription',
    membershipMutationLimiter,
    deps.authenticate,
    authorize('Registrado'),
    validate({ body: createSubscriptionSchema }),
    deps.membershipController.createSubscription
  );

  router.post(
    '/:id/cancel-subscription',
    membershipMutationLimiter,
    deps.authenticate,
    deps.membershipController.cancelSubscription
  );

  router.post(
    '/initiate-payment',
    membershipMutationLimiter,
    deps.authenticate,
    authorize('Registrado'),
    validate({ body: initiateMembershipPaymentSchema }),
    deps.membershipController.initiatePayment
  );

  router.post(
    '/retry-payment',
    membershipMutationLimiter,
    deps.authenticate,
    authorize('Registrado'),
    validate({ body: initiateMembershipPaymentSchema }),
    deps.membershipController.retryPayment
  );

  router.post(
    '/redeem',
    membershipMutationLimiter,
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ body: redeemCouponSchema }),
    deps.membershipController.redeemCoupon
  );

  router.post(
    '/:id/approve',
    membershipMutationLimiter,
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ params: membershipIdParamSchema }),
    deps.membershipController.approvePending
  );

  router.get(
    '/:id/coupon-history',
    membershipLimiter,
    deps.authenticate,
    deps.membershipController.getCouponHistory
  );

  router.put(
    '/:id/coupons',
    membershipMutationLimiter,
    deps.authenticate,
    authorize('Admin'),
    deps.membershipController.addCouponsToMembership
  );

  return router;
};
