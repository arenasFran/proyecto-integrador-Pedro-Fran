import { Router } from 'express';
import { ReportsController } from '../controllers/reports/ReportsController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { authorize } from '../middlewares/auth.middleware';

export const createReportsRouter = (deps: {
  reportsController: ReportsController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.get(
    '/orders/csv',
    deps.authenticate,
    authorize('Admin'),
    deps.reportsController.exportOrdersCsv,
  );

  router.get(
    '/sales/csv',
    deps.authenticate,
    authorize('Admin'),
    deps.reportsController.exportSalesCsv,
  );

  router.get(
    '/products/csv',
    deps.authenticate,
    authorize('Admin'),
    deps.reportsController.exportProductsCsv,
  );

  return router;
};