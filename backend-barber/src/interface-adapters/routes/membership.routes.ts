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
} from '../validators/membership.validator';

const membershipLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const membershipMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
    '/:id',
    deps.authenticate,
    authorize('Admin'),
    deps.membershipController.getById
  );

  router.post(
    '/redeem',
    membershipMutationLimiter,
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ body: redeemCouponSchema }),
    deps.membershipController.redeemCoupon
  );

  return router;
};
