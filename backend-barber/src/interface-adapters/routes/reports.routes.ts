import { Router } from 'express';
import { ReportsController } from '../controllers/reports/ReportsController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  membershipsReportQuerySchema,
  ordersReportQuerySchema,
  salesReportQuerySchema,
} from '../validators/reports.validator';

export const createReportsRouter = (deps: {
  reportsController: ReportsController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.get(
    '/orders/csv',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: ordersReportQuerySchema }),
    deps.reportsController.exportOrdersCsv,
  );

  router.get(
    '/sales/csv',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: salesReportQuerySchema }),
    deps.reportsController.exportSalesCsv,
  );

  router.get(
    '/products/csv',
    deps.authenticate,
    authorize('Admin'),
    deps.reportsController.exportProductsCsv,
  );

  router.get(
    '/memberships/csv',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: membershipsReportQuerySchema }),
    deps.reportsController.exportMembershipsCsv,
  );

  return router;
};
