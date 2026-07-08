import express from 'express';
import { AnalyticsController } from '../controllers/analytics/AnalyticsController';
import { MongoAnalyticsRepository } from '../../infrastructure/repositories/mongodb/MongoAnalyticsRepository';
import { authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  overviewQuerySchema,
  heatmapQuerySchema,
  distribucionQuerySchema,
  reservasGananciasQuerySchema,
  horasQuerySchema,
  diasSemanaQuerySchema,
  clientesRecurrentesQuerySchema,
  ingresosServicioQuerySchema,
  clientesListQuerySchema,
} from '../validators/analytics.validator';

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
    '/years',
    authenticate,
    authorize('Admin'),
    controller.getYearsHandler,
  );

  router.get(
    '/charts/reservas-ganancias',
    authenticate,
    authorize('Admin'),
    validate({ query: reservasGananciasQuerySchema }),
    controller.getReservasGananciasHandler,
  );

  router.get(
    '/charts/horas',
    authenticate,
    authorize('Admin'),
    validate({ query: horasQuerySchema }),
    controller.getHorasDistributionHandler,
  );

  router.get(
    '/charts/dias-semana',
    authenticate,
    authorize('Admin'),
    validate({ query: diasSemanaQuerySchema }),
    controller.getDiasSemanaDistributionHandler,
  );

  router.get(
    '/charts/clientes-recurrentes',
    authenticate,
    authorize('Admin'),
    validate({ query: clientesRecurrentesQuerySchema }),
    controller.getClientesRecurrentesHandler,
  );

  router.get(
    '/charts/ingresos-servicio',
    authenticate,
    authorize('Admin'),
    validate({ query: ingresosServicioQuerySchema }),
    controller.getIngresosPorServicioHandler,
  );

  router.get(
    '/clientes',
    authenticate,
    authorize('Admin'),
    validate({ query: clientesListQuerySchema }),
    controller.getClientesListHandler,
  );

  router.get(
    '/clientes/:clientKey/turnos',
    authenticate,
    authorize('Admin'),
    controller.getClientAppointmentsHandler,
  );

  router.get(
    '/ecommerce/overview',
    authenticate,
    authorize('Admin'),
    controller.getEcommerceOverviewHandler,
  );

  router.get(
    '/ecommerce/products',
    authenticate,
    authorize('Admin'),
    controller.getProductPerformanceHandler,
  );

  return router;
};