import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AnalisisCorteController } from '../controllers/analisis-corte/AnalisisCorteController';
import { createAuthenticate, authorize } from '../middlewares/auth.middleware';
import { createRequireActiveMembership } from '../middlewares/membership.middleware';
import { uploadAnalisisFoto, handleUploadErrors } from '../middlewares/upload.middleware';
import { MongoMembershipRepository } from '../../infrastructure/repositories/mongodb/MongoMembershipRepository';

const analisisCorteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de análisis, esperá 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user!._id,
});

// Cada análisis muestra 2-3 cortes recomendados, cada uno dispara una generación de imagen.
const imagenEjemploLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiados intentos de generación de imagen, esperá 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user!._id,
});

export const createAnalisisCorteRouter = (deps: {
  analisisCorteController: AnalisisCorteController;
  authenticate: ReturnType<typeof createAuthenticate>;
  membershipRepository: MongoMembershipRepository;
}) => {
  const router = Router();
  const requireActiveMembership = createRequireActiveMembership(deps.membershipRepository);

  router.post(
    '/',
    deps.authenticate,
    authorize('Registrado'),
    analisisCorteLimiter,
    requireActiveMembership,
    handleUploadErrors(uploadAnalisisFoto),
    deps.analisisCorteController.analizar
  );

  router.get(
    '/historial',
    deps.authenticate,
    authorize('Registrado'),
    requireActiveMembership,
    deps.analisisCorteController.historial
  );

  router.post(
    '/imagen-ejemplo',
    deps.authenticate,
    authorize('Registrado'),
    imagenEjemploLimiter,
    requireActiveMembership,
    deps.analisisCorteController.imagenEjemplo
  );

  return router;
};
