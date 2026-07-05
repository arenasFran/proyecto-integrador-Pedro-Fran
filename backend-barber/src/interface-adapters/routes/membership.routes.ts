import { Router } from 'express';
import { MembershipController } from '../controllers/membership/MembershipController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { authorize } from '../middlewares/auth.middleware';
import {
  createMembershipSchema,
  redeemCouponSchema,
  queryMembershipsSchema,
} from '../validators/membership.validator';

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
    deps.authenticate,
    validate({ body: createMembershipSchema }),
    deps.membershipController.create
  );

  router.get(
    '/',
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
    deps.authenticate,
    authorize('Admin', 'Empleado'),
    validate({ body: redeemCouponSchema }),
    deps.membershipController.redeemCoupon
  );

  return router;
};
