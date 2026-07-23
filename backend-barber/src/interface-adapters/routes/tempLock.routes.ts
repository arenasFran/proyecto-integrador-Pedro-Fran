import express from 'express';
import rateLimit from 'express-rate-limit';
import { TempLockController } from '../controllers/tempLock/TempLockController';
import { validate } from '../middlewares/validation.middleware';
import Joi from 'joi';

const tempLockSchema = Joi.object({
  barberId: Joi.string().required(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  startTime: Joi.string()
    .pattern(/^\d{2}:\d{2}$/)
    .required(),
});

const tempLockLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Esperá 5 minutos.' },
});

export const createTempLockRouter = (deps: {
  tempLockController: TempLockController;
}) => {
  const router = express.Router({ mergeParams: true });

  router.post(
    '/',
    tempLockLimiter,
    validate({ body: tempLockSchema }),
    deps.tempLockController.create
  );

  router.delete(
    '/:tempLockId',
    deps.tempLockController.release
  );

  return router;
};