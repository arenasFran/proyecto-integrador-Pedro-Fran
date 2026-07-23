import { Router } from 'express';
import { MercadoPagoDebugController } from '../controllers/debug/MercadoPagoDebugController';

export const buildDebugRouter = () => {
  const router = Router();
  const controller = new MercadoPagoDebugController();

  router.get('/mercadopago/me', controller.getMe);
  router.get('/mercadopago/payment/:id', controller.getPaymentById);

  return router;
};
