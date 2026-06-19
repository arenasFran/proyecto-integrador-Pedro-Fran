import express from 'express';
import { AnalyticsController } from '../controllers/analytics/AnalyticsController';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { overviewQuerySchema, heatmapQuerySchema, distribucionQuerySchema, reservasGananciasQuerySchema } from '../validators/analytics.validator';

export const createAnalyticsRouter = (deps: {
  analyticsController: AnalyticsController;
  authenticate: express.RequestHandler;
}) => {
  const router = express.Router();

  router.get(
    '/overview',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: overviewQuerySchema }),
    deps.analyticsController.getOverviewHandler,
  );

  router.get(
    '/heatmap',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: heatmapQuerySchema }),
    deps.analyticsController.getHeatmapHandler,
  );

  router.get(
    '/charts/distribucion',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: distribucionQuerySchema }),
    deps.analyticsController.getDistribucionHandler,
  );

  router.get(
    '/charts/reservas-ganancias',
    deps.authenticate,
    authorize('Admin'),
    validate({ query: reservasGananciasQuerySchema }),
    deps.analyticsController.getReservasGananciasHandler,
  );

  return router;
};
