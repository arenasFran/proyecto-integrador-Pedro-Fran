const createPreferenceMock = jest.fn();
const getPaymentMock = jest.fn();
const validateWebhookSignatureMock = jest.fn();

jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/infrastructure/services/MercadoPagoService', () => ({
  MercadoPagoService: jest.fn().mockImplementation(() => ({
    createPreference: createPreferenceMock,
    getPayment: getPaymentMock,
    validateWebhookSignature: validateWebhookSignatureMock,
  })),
}));

import request from 'supertest';
import app from '../../../src/app';
import { ProductModel } from '../../../src/infrastructure/repositories/mongodb/models/product.model';
import { OrderModel } from '../../../src/infrastructure/repositories/mongodb/models/order.model';
import { PaymentModel } from '../../../src/infrastructure/repositories/mongodb/models/payment.model';
import { signToken, seedProduct, seedRegisteredClient, waitFor } from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

const webhookBody = (mpPaymentId: string) => ({
  type: 'payment',
  action: 'payment.updated',
  data: { id: mpPaymentId },
});

describeIfMongo('Payment routes — integración real (webhook, consultas)', () => {
  beforeEach(async () => {
    createPreferenceMock.mockReset();
    getPaymentMock.mockReset();
    validateWebhookSignatureMock.mockReset();
    validateWebhookSignatureMock.mockReturnValue(true);
    await ProductModel.deleteMany({});
    await OrderModel.deleteMany({});
    await PaymentModel.deleteMany({});
  });

  const checkoutOnline = async (opts?: { stock?: number; price?: number }) => {
    const { productId } = await seedProduct({ stock: opts?.stock ?? 10, price: opts?.price ?? 500 });
    const { clientId, email } = await seedRegisteredClient();
    const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
    createPreferenceMock.mockResolvedValue({ preferenceId: 'pref-1', initPoint: 'https://mp.test/init' });

    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ productId, quantity: 2 }] });

    const payment = await PaymentModel.findOne({ referenceId: created.body.orderId });

    return { productId, clientId, token, orderId: created.body.orderId as string, paymentId: payment!._id.toString() };
  };

  describe('POST /api/payments/webhook — firma HMAC', () => {
    it('rechaza el webhook con firma inválida y no consulta el pago en MP', async () => {
      validateWebhookSignatureMock.mockReturnValue(false);

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', 'ts=1,v1=bad')
        .set('x-request-id', 'req-1')
        .send(webhookBody('mp-999'));

      expect(res.status).toBe(401);
      expect(getPaymentMock).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/payments/webhook — pago aprobado de una orden', () => {
    it('aprueba el payment, marca la orden como paga y descuenta el stock', async () => {
      const { orderId, paymentId, productId } = await checkoutOnline({ stock: 10 });
      getPaymentMock.mockResolvedValue({
        id: 'mp-123',
        status: 'approved',
        statusDetail: 'accredited',
        transactionAmount: 1000,
        paymentMethodId: 'visa',
        externalReference: paymentId,
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', 'ts=1,v1=ok')
        .set('x-request-id', 'req-2')
        .send(webhookBody('mp-123'));

      expect(res.status).toBe(200);

      await waitFor(async () => {
        const payment = await PaymentModel.findById(paymentId);
        return payment?.status === 'approved';
      });

      const payment = await PaymentModel.findById(paymentId);
      expect(payment!.mpPaymentId).toBe('mp-123');

      const order = await OrderModel.findById(orderId);
      expect(order!.status).toBe('paid');

      const product = await ProductModel.findById(productId);
      expect(product!.stock).toBe(8);
    });

    it('una vez aprobado el pago, ya no se puede cancelar la orden por la ruta administrativa', async () => {
      const { orderId, paymentId } = await checkoutOnline();
      getPaymentMock.mockResolvedValue({
        id: 'mp-789',
        status: 'approved',
        statusDetail: 'accredited',
        transactionAmount: 1000,
        paymentMethodId: 'visa',
        externalReference: paymentId,
      });

      await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', 'ts=1,v1=ok')
        .set('x-request-id', 'req-5')
        .send(webhookBody('mp-789'));

      await waitFor(async () => {
        const order = await OrderModel.findById(orderId);
        return order?.status === 'paid';
      });

      const { token: adminToken } = signToken({ kind: 'Admin' });
      const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' });

      expect(res.status).toBe(409);

      const order = await OrderModel.findById(orderId);
      expect(order!.status).toBe('paid');
    });
  });

  describe('POST /api/payments/webhook — pago rechazado', () => {
    it('marca el payment como rejected y cancela la orden pendiente', async () => {
      const { orderId, paymentId } = await checkoutOnline();
      getPaymentMock.mockResolvedValue({
        id: 'mp-456',
        status: 'rejected',
        statusDetail: 'cc_rejected_insufficient_amount',
        transactionAmount: 1000,
        paymentMethodId: 'visa',
        externalReference: paymentId,
      });

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', 'ts=1,v1=ok')
        .set('x-request-id', 'req-3')
        .send(webhookBody('mp-456'));

      expect(res.status).toBe(200);

      await waitFor(async () => {
        const payment = await PaymentModel.findById(paymentId);
        return payment?.status === 'rejected';
      });

      const order = await OrderModel.findById(orderId);
      expect(order!.status).toBe('cancelled');
    });
  });

  describe('POST /api/payments/webhook — pago no encontrado en MP', () => {
    it('no rompe ni modifica nada si MP no devuelve el pago', async () => {
      const { orderId } = await checkoutOnline();
      getPaymentMock.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/payments/webhook')
        .set('x-signature', 'ts=1,v1=ok')
        .set('x-request-id', 'req-4')
        .send(webhookBody('mp-inexistente'));

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 100));

      const order = await OrderModel.findById(orderId);
      expect(order!.status).toBe('pending');
    });
  });

  describe('GET /api/payments/by-preference/:preferenceId', () => {
    it('devuelve null si no existe el pago', async () => {
      const res = await request(app).get('/api/payments/by-preference/pref-inexistente');
      expect(res.status).toBe(200);
      expect(res.body.payment).toBeNull();
    });

    it('el dueño autenticado puede ver el pago', async () => {
      const { clientId, token } = await checkoutOnline();
      const payment = await PaymentModel.findOne({ userId: clientId });

      const res = await request(app)
        .get(`/api/payments/by-preference/${payment!.mpPreferenceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.payment).toMatchObject({ id: payment!._id.toString() });
    });

    it('otro usuario autenticado no puede ver el pago ajeno', async () => {
      await checkoutOnline();
      const payment = await PaymentModel.findOne({});
      const { token: otherToken } = signToken({ kind: 'Registrado' });

      const res = await request(app)
        .get(`/api/payments/by-preference/${payment!.mpPreferenceId}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('sin autenticación y con un userId real requiere login (401)', async () => {
      await checkoutOnline();
      const payment = await PaymentModel.findOne({});

      const res = await request(app).get(`/api/payments/by-preference/${payment!.mpPreferenceId}`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/payments/by-reference/:referenceId', () => {
    it('requiere autenticación', async () => {
      const { orderId } = await checkoutOnline();
      const res = await request(app).get(`/api/payments/by-reference/${orderId}`).query({ type: 'product_order' });
      expect(res.status).toBe(401);
    });

    it('devuelve el pago asociado a la orden', async () => {
      const { orderId, token } = await checkoutOnline();

      const res = await request(app)
        .get(`/api/payments/by-reference/${orderId}`)
        .query({ type: 'product_order' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.payment).toMatchObject({ referenceId: orderId, type: 'product_order' });
    });
  });

  describe('GET /api/payments — listado (autenticado)', () => {
    it('devuelve los pagos paginados', async () => {
      await checkoutOnline();
      const { token: adminToken } = signToken({ kind: 'Admin' });

      const res = await request(app).get('/api/payments').set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
    });

    it('rechaza sin autenticación', async () => {
      const res = await request(app).get('/api/payments');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/payments/:id', () => {
    it('el dueño puede ver su pago por id', async () => {
      const { token } = await checkoutOnline();
      const payment = await PaymentModel.findOne({});

      const res = await request(app)
        .get(`/api/payments/${payment!._id.toString()}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('un admin puede ver el pago de otro usuario', async () => {
      await checkoutOnline();
      const payment = await PaymentModel.findOne({});
      const { token: adminToken } = signToken({ kind: 'Admin' });

      const res = await request(app)
        .get(`/api/payments/${payment!._id.toString()}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('otro cliente no puede ver un pago ajeno', async () => {
      await checkoutOnline();
      const payment = await PaymentModel.findOne({});
      const { token: otherToken } = signToken({ kind: 'Registrado' });

      const res = await request(app)
        .get(`/api/payments/${payment!._id.toString()}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });

    it('devuelve 404 si el pago no existe', async () => {
      const { token } = await checkoutOnline();
      const res = await request(app)
        .get('/api/payments/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
