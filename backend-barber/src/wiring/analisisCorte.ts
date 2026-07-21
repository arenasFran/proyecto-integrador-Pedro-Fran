import { MongoClientRepository } from '../infrastructure/repositories/mongodb/MongoClientRepository';
import { MongoMembershipRepository } from '../infrastructure/repositories/mongodb/MongoMembershipRepository';
import { MongoServiceRepository } from '../infrastructure/repositories/mongodb/MongoServiceRepository';
import { MongoAnalisisCorteRepository } from '../infrastructure/repositories/mongodb/MongoAnalisisCorteRepository';
import { RekognitionFaceValidationService } from '../infrastructure/services/RekognitionFaceValidationService';
import { GeminiRecommendationService } from '../infrastructure/services/GeminiRecommendationService';
import { AnalizarCorteUseCase } from '../application/use-cases/analisis-corte/AnalizarCorteUseCase';
import { AnalisisCorteController } from '../interface-adapters/controllers/analisis-corte/AnalisisCorteController';
import { createAnalisisCorteRouter } from '../interface-adapters/routes/analisisCorte.routes';
import { createAuthenticate } from '../interface-adapters/middlewares/auth.middleware';
import { buildTokenService } from './auth';
import { getConfig } from '../infrastructure/config/env';

export const buildAnalisisCorteRouter = () => {
  const config = getConfig();

  const clientRepository = new MongoClientRepository();
  const membershipRepository = new MongoMembershipRepository();
  const serviceRepository = new MongoServiceRepository();
  const analisisCorteRepository = new MongoAnalisisCorteRepository();

  const faceValidationService = new RekognitionFaceValidationService({
    region: config.awsRegion,
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
    sessionToken: config.awsSessionToken,
  });
  const recommendationService = new GeminiRecommendationService(config.geminiApiKey);

  const analizarCorte = new AnalizarCorteUseCase(
    clientRepository,
    membershipRepository,
    serviceRepository,
    analisisCorteRepository,
    faceValidationService,
    recommendationService
  );

  const controller = new AnalisisCorteController(analizarCorte, analisisCorteRepository, clientRepository);

  const tokenService = buildTokenService();
  const authenticate = createAuthenticate(tokenService);

  return createAnalisisCorteRouter({
    analisisCorteController: controller,
    authenticate,
    membershipRepository,
  });
};
