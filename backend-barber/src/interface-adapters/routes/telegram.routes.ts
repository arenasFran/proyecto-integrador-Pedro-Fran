import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { TelegramController } from '../controllers/telegram/TelegramController';
import { authorize, createAuthenticate } from '../middlewares/auth.middleware';

const linkTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createTelegramRouter = (deps: {
  telegramController: TelegramController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.post(
    '/link-token',
    linkTokenLimiter,
    deps.authenticate,
    authorize('Registrado'),
    deps.telegramController.generateToken
  );

  return router;
};
