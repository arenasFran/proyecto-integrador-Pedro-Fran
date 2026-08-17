const createPreferenceMock = jest.fn();

jest.mock('../../../src/infrastructure/config/mailer', () => ({
  __esModule: true,
  default: { sendMail: jest.fn().mockResolvedValue(undefined) },
  sendMail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/infrastructure/services/MercadoPagoService', () => ({
  MercadoPagoService: jest.fn().mockImplementation(() => ({
    createPreference: createPreferenceMock,
    getPayment: jest.fn(),
    validateWebhookSignature: jest.fn().mockReturnValue(true),
  })),
}));

import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../../src/app';
import { ProductModel } from '../../../src/infrastructure/repositories/mongodb/models/product.model';
import { OrderModel } from '../../../src/infrastructure/repositories/mongodb/models/order.model';
import { PaymentModel } from '../../../src/infrastructure/repositories/mongodb/models/payment.model';
import { signToken, seedProduct, seedRegisteredClient } from '../../test-utils/factories';

const isMongoReady = process.env.MONGO_READY === 'true';
const describeIfMongo = isMongoReady ? describe : describe.skip;

describeIfMongo('Order routes — integración real (checkout, administración)', () => {
  beforeEach(async () => {
    createPreferenceMock.mockReset();
    await ProductModel.deleteMany({});
    await OrderModel.deleteMany({});
    await PaymentModel.deleteMany({});
  });

  describe('POST /api/orders — checkout', () => {
    it('rechaza el checkout sin autenticación', async () => {
      const { productId } = await seedProduct();
      const res = await request(app)
        .post('/api/orders')
        .send({ items: [{ productId, quantity: 1 }] });
      expect(res.status).toBe(401);
    });

    it('pago local: crea la orden pendiente sin descontar stock hasta cobrarla', async () => {
      const { productId } = await seedProduct({ price: 500, stock: 10 });
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 2 }], paymentMethod: 'local' });

      expect(res.status).toBe(201);
      expect(res.body.orderId).toBeTruthy();

      const order = await OrderModel.findById(res.body.orderId);
      expect(order!.status).toBe('pending');
      expect(order!.paymentMethod).toBe('local');

      const product = await ProductModel.findById(productId);
      expect(product!.stock).toBe(10);

      const payment = await PaymentModel.findOne({ referenceId: res.body.orderId });
      expect(payment).not.toBeNull();
      expect(payment!.status).toBe('pending');

      expect(createPreferenceMock).not.toHaveBeenCalled();
    });

    it('pago online: crea preferencia de MP y deja la orden pendiente sin tocar stock', async () => {
      const { productId } = await seedProduct({ price: 500, stock: 10 });
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      createPreferenceMock.mockResolvedValue({
        preferenceId: 'pref-123',
        initPoint: 'https://mp.test/init',
        sandboxInitPoint: 'https://mp.test/sandbox',
      });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 1 }] });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ preferenceId: 'pref-123', initPoint: 'https://mp.test/init' });

      const order = await OrderModel.findById(res.body.orderId);
      expect(order!.status).toBe('pending');

      const product = await ProductModel.findById(productId);
      expect(product!.stock).toBe(10);

      const payment = await PaymentModel.findOne({ referenceId: res.body.orderId });
      expect(payment).not.toBeNull();
      expect(payment!.status).toBe('pending');
      expect(payment!.mpPreferenceId).toBe('pref-123');
    });

    it('rechaza el checkout si no hay stock suficiente', async () => {
      const { productId } = await seedProduct({ stock: 1 });
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 5 }], paymentMethod: 'local' });

      expect(res.status).toBe(400);
      const product = await ProductModel.findById(productId);
      expect(product!.stock).toBe(1);
    });

    it('rechaza el checkout de un producto inactivo', async () => {
      const { productId } = await seedProduct({ status: 'inactive' });
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });

      expect(res.status).toBe(400);
    });

    it('rechaza el body si el carrito está vacío (validación de Joi)', async () => {
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/orders/me — mis órdenes', () => {
    it('devuelve solo las órdenes del cliente autenticado', async () => {
      const { productId } = await seedProduct();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: otherToken } = signToken({ kind: 'Registrado' });

      await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });
      await request(app).post('/api/orders').set('Authorization', `Bearer ${otherToken}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });

      const res = await request(app).get('/api/orders/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(1);
    });
  });

  describe('GET /api/orders — listado administrativo', () => {
    it('rechaza a un cliente no staff', async () => {
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app).get('/api/orders').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('permite a un Admin listar y filtrar por status', async () => {
      const { productId } = await seedProduct();
      const { clientId, email } = await seedRegisteredClient();
      const { token: clientToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: adminToken } = signToken({ kind: 'Admin' });

      await request(app).post('/api/orders').set('Authorization', `Bearer ${clientToken}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });

      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'pending' });

      expect(res.status).toBe(200);
      expect(res.body.orders).toHaveLength(1);
      expect(res.body.orders[0].status).toBe('pending');
    });
  });

  describe('GET /api/orders/:id — ownership', () => {
    it('el dueño puede ver su orden', async () => {
      const { productId } = await seedProduct();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });

      const res = await request(app).get(`/api/orders/${created.body.orderId}`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.order.id).toBe(created.body.orderId);
    });

    it('otro cliente no puede ver una orden ajena', async () => {
      const { productId } = await seedProduct();
      const { clientId, email } = await seedRegisteredClient();
      const { token: ownerToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: otherToken } = signToken({ kind: 'Registrado' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${ownerToken}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });

      const res = await request(app).get(`/api/orders/${created.body.orderId}`).set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/orders/manual — orden manual (staff)', () => {
    it('rechaza a un cliente no staff', async () => {
      const { productId } = await seedProduct();
      const { clientId, email } = await seedRegisteredClient();
      const { token } = signToken({ id: clientId, email, kind: 'Registrado' });

      const res = await request(app)
        .post('/api/orders/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 1 }], clientName: 'Cliente Mostrador' });

      expect(res.status).toBe(403);
    });

    it('un Admin crea una orden manual paga y descuenta stock', async () => {
      const { productId } = await seedProduct({ stock: 10 });
      const { token } = signToken({ kind: 'Admin' });

      const res = await request(app)
        .post('/api/orders/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 3 }], clientName: 'Cliente Mostrador', status: 'paid' });

      expect(res.status).toBe(201);
      expect(res.body.order.status).toBe('paid');

      const product = await ProductModel.findById(productId);
      expect(product!.stock).toBe(7);

      // Walk-in sin cuenta registrada: no hay un userId real para asociar al Payment,
      // así que directamente no se crea (antes esto explotaba con un BSONError silencioso).
      const payment = await PaymentModel.findOne({ referenceId: res.body.order.id });
      expect(payment).toBeNull();
    });

    it('un Admin crea una orden manual paga para un cliente registrado y sí se guarda el Payment', async () => {
      const { productId } = await seedProduct({ stock: 10 });
      const { clientId } = await seedRegisteredClient();
      const { token } = signToken({ kind: 'Admin' });

      const res = await request(app)
        .post('/api/orders/manual')
        .set('Authorization', `Bearer ${token}`)
        .send({ items: [{ productId, quantity: 1 }], userId: clientId, status: 'paid' });

      expect(res.status).toBe(201);

      const payment = await PaymentModel.findOne({ referenceId: res.body.order.id });
      expect(payment).not.toBeNull();
      expect(payment!.status).toBe('approved');
    });
  });

  describe('PATCH /api/orders/:id/status — actualización administrativa', () => {
    it('un Admin marca la orden pendiente como pagada y aprueba el payment asociado', async () => {
      const { productId } = await seedProduct({ stock: 10 });
      const { clientId, email } = await seedRegisteredClient();
      const { token: clientToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: adminToken } = signToken({ kind: 'Admin' });
      createPreferenceMock.mockResolvedValue({ preferenceId: 'pref-1', initPoint: 'https://mp.test/init' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${clientToken}`)
        .send({ items: [{ productId, quantity: 2 }] });

      const res = await request(app)
        .patch(`/api/orders/${created.body.orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'paid' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('paid');

      const payment = await PaymentModel.findOne({ referenceId: created.body.orderId });
      expect(payment!.status).toBe('approved');

      const product = await ProductModel.findById(productId);
      expect(product!.stock).toBe(8);
    });

    it('marca la orden como stock_issue (sin aprobar el payment) si ya no hay stock suficiente', async () => {
      const { productId } = await seedProduct({ stock: 5 });
      const { clientId, email } = await seedRegisteredClient();
      const { token: clientToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: adminToken } = signToken({ kind: 'Admin' });
      createPreferenceMock.mockResolvedValue({ preferenceId: 'pref-1', initPoint: 'https://mp.test/init' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${clientToken}`)
        .send({ items: [{ productId, quantity: 3 }] });

      // Se vende el resto del stock por otra vía antes de que se apruebe este pedido.
      await ProductModel.updateOne({ _id: productId }, { $set: { stock: 1 } });

      const res = await request(app)
        .patch(`/api/orders/${created.body.orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'paid' });

      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('stock_issue');

      const payment = await PaymentModel.findOne({ referenceId: created.body.orderId });
      expect(payment!.status).toBe('pending');
    });

    it('un Admin cancela una orden paga y restaura el stock', async () => {
      const { productId } = await seedProduct({ stock: 10 });
      const { clientId, email } = await seedRegisteredClient();
      const { token: clientToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: adminToken } = signToken({ kind: 'Admin' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${clientToken}`)
        .send({ items: [{ productId, quantity: 2 }], paymentMethod: 'local' });

      const res = await request(app)
        .patch(`/api/orders/${created.body.orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' });

      expect(res.status).toBe(200);
      const product = await ProductModel.findById(productId);
      expect(product!.stock).toBe(10);
    });

    it('rechaza un status inválido (validación de Joi)', async () => {
      const { productId } = await seedProduct();
      const { clientId, email } = await seedRegisteredClient();
      const { token: clientToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: adminToken } = signToken({ kind: 'Admin' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${clientToken}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });

      const res = await request(app)
        .patch(`/api/orders/${created.body.orderId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'bogus' });

      expect(res.status).toBe(400);
    });

    it('rechaza a un Empleado que no sea Admin/Empleado autorizado... (permite Empleado)', async () => {
      const { productId } = await seedProduct();
      const { clientId, email } = await seedRegisteredClient();
      const { token: clientToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: empleadoToken } = signToken({ kind: 'Empleado' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${clientToken}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });

      const res = await request(app)
        .patch(`/api/orders/${created.body.orderId}/status`)
        .set('Authorization', `Bearer ${empleadoToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    it('un Empleado no puede eliminar (solo Admin)', async () => {
      const { productId } = await seedProduct();
      const { clientId, email } = await seedRegisteredClient();
      const { token: clientToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: empleadoToken } = signToken({ kind: 'Empleado' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${clientToken}`)
        .send({ items: [{ productId, quantity: 1 }], paymentMethod: 'local' });

      const res = await request(app)
        .delete(`/api/orders/${created.body.orderId}`)
        .set('Authorization', `Bearer ${empleadoToken}`);

      expect(res.status).toBe(403);
    });

    it('un Admin elimina la orden y restaura el stock', async () => {
      const { productId } = await seedProduct({ stock: 10 });
      const { clientId, email } = await seedRegisteredClient();
      const { token: clientToken } = signToken({ id: clientId, email, kind: 'Registrado' });
      const { token: adminToken } = signToken({ kind: 'Admin' });

      const created = await request(app).post('/api/orders').set('Authorization', `Bearer ${clientToken}`)
        .send({ items: [{ productId, quantity: 2 }], paymentMethod: 'local' });

      const res = await request(app)
        .delete(`/api/orders/${created.body.orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const order = await OrderModel.findById(created.body.orderId);
      expect(order).toBeNull();
      const product = await ProductModel.findById(productId);
      expect(product!.stock).toBe(10);
    });
  });
});
