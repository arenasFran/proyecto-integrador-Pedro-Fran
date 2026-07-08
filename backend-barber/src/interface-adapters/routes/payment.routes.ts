import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PaymentController } from '../controllers/payment/PaymentController';
import { createAuthenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { paymentIdParamSchema } from '../validators/payment.validator';

const MERCADOPAGO_IPS = [
  '216.33.196.0/24',
  '216.33.197.0/24',
  '216.33.198.0/24',
  '216.33.199.0/24',
  '216.33.200.0/24',
  '216.33.201.0/24',
  '216.33.202.0/24',
  '216.33.203.0/24',
  '216.33.204.0/24',
  '216.33.205.0/24',
  '216.33.206.0/24',
  '216.33.207.0/24',
  '23.221.227.0/24',
];

function ipInCIDR(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
  const rangeNum = range.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct), 0) >>> 0;
  return (ipNum & mask) === (rangeNum & mask);
}

function mpIpFilter(req: any, _res: any, next: any) {
  const ip = req.ip || req.connection?.remoteAddress || '';
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  const allowed = MERCADOPAGO_IPS.some(cidr => ipInCIDR(cleanIp, cidr));
  if (!allowed) {
    return _res.status(403).json({ error: 'Acceso denegado.' });
  }
  next();
}

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes al webhook.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const createPaymentRouter = (deps: {
  paymentController: PaymentController;
  authenticate: ReturnType<typeof createAuthenticate>;
}) => {
  const router = Router();

  router.post(
    '/webhook',
    mpIpFilter,
    webhookLimiter,
    deps.paymentController.handleWebhook
  );

  router.get(
    '/:id',
    deps.authenticate,
    validate({ params: paymentIdParamSchema }),
    deps.paymentController.getById
  );

  return router;
};
