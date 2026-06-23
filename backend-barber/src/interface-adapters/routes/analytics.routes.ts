import express from 'express';
import { AnalyticsController } from '../controllers/analytics/AnalyticsController';
import { MongoAnalyticsRepository } from '../../infrastructure/repositories/mongodb/MongoAnalyticsRepository';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { overviewQuerySchema, heatmapQuerySchema, distribucionQuerySchema, reservasGananciasQuerySchema } from '../validators/analytics.validator';

export const createAnalyticsRouter = (authenticate: express.RequestHandler) => {
  const controller = new AnalyticsController(new MongoAnalyticsRepository());
  const router = express.Router();

  router.get(
    '/overview',
    authenticate,
    authorize('Admin'),
    validate({ query: overviewQuerySchema }),
    controller.getOverviewHandler,
  );

  router.get(
    '/heatmap',
    authenticate,
    authorize('Admin'),
    validate({ query: heatmapQuerySchema }),
    controller.getHeatmapHandler,
  );

  router.get(
    '/charts/distribucion',
    authenticate,
    authorize('Admin'),
    validate({ query: distribucionQuerySchema }),
    controller.getDistribucionHandler,
  );

  router.get(
    '/charts/reservas-ganancias',
    authenticate,
    authorize('Admin'),
    validate({ query: reservasGananciasQuerySchema }),
    controller.getReservasGananciasHandler,
  );

  return router;
};