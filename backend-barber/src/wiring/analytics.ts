import { GetOverviewUseCase } from '../application/use-cases/analytics/GetOverviewUseCase';
import { GetHeatmapUseCase } from '../application/use-cases/analytics/GetHeatmapUseCase';
import { GetDistribucionUseCase } from '../application/use-cases/analytics/GetDistribucionUseCase';
import { GetReservasGananciasUseCase } from '../application/use-cases/analytics/GetReservasGananciasUseCase';
import { MongoAnalyticsRepository } from '../infrastructure/repositories/mongodb/MongoAnalyticsRepository';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { AnalyticsController } from '../interface-adapters/controllers/analytics/AnalyticsController';
import { createAnalyticsRouter } from '../interface-adapters/routes/analytics.routes';
import { buildTokenService } from './auth';

export const buildAnalyticsRouter = () => {
  const analyticsRepository = new MongoAnalyticsRepository();
  const tokenService = buildTokenService();

  const getOverview = new GetOverviewUseCase(analyticsRepository);
  const getHeatmap = new GetHeatmapUseCase(analyticsRepository);
  const getDistribucion = new GetDistribucionUseCase(analyticsRepository);
  const getReservasGanancias = new GetReservasGananciasUseCase(analyticsRepository);

  const analyticsController = new AnalyticsController(getOverview, getHeatmap, getDistribucion, getReservasGanancias);

  const authenticate = createAuthenticate(tokenService);

  return createAnalyticsRouter({ analyticsController, authenticate });
};
