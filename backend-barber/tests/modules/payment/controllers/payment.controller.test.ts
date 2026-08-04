import { PaymentController } from '../../../../src/interface-adapters/controllers/payment/PaymentController';
import { Payment } from '../../../../src/domain/entities/Payment';
import { createMockReqFull, createMockRes } from '../../../test-utils/expressMocks';
import { makeMockPaymentRepository, makeMockPaymentService } from '../../../test-utils/mocks';

const makePayment = (overrides?: Partial<{ userId: string; status: string }>) =>
  Payment.restore({
    id: 'pay-1',
    type: 'product_order',
    referenceId: 'order-1',
    status: (overrides?.status as any) ?? 'approved',
    mpPaymentId: 'mp-1',
    mpPreferenceId: 'pref-1',
    amount: 250,
    currency: 'UYU',
    userId: overrides?.userId ?? 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('PaymentController', () => {
  let processWebhook: { execute: jest.Mock };
  let paymentRepository: ReturnType<typeof makeMockPaymentRepository>;
  let mercadoPagoService: ReturnType<typeof makeMockPaymentService>;
  let controller: PaymentController;

  beforeEach(() => {
    processWebhook = { execute: jest.fn().mockResolvedValue(undefined) };
    paymentRepository = makeMockPaymentRepository();
    mercadoPagoService = makeMockPaymentService();
    controller = new PaymentController(processWebhook as any, paymentRepository as any, mercadoPagoService as any);
  });

  describe('handleWebhook', () => {
    it('debe responder 200 y procesar el webhook cuando la firma es válida', async () => {
      mercadoPagoService.validateWebhookSignature.mockReturnValue(true);
      const req = createMockReqFull({ body: { type: 'payment', data: { id: '123' } } });
      (req as any).headers = { 'x-signature': 'sig', 'x-request-id': 'req-1' };
      (req as any).query = {};
      const res = createMockRes();

      controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mercadoPagoService.validateWebhookSignature).toHaveBeenCalled();
    });

    it('debe responder 401 si la firma HMAC es inválida', async () => {
      mercadoPagoService.validateWebhookSignature.mockReturnValue(false);
      const req = createMockReqFull({ body: { type: 'payment', data: { id: '123' } } });
      (req as any).headers = {};
      (req as any).query = {};
      const res = createMockRes();

      controller.handleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(processWebhook.execute).not.toHaveBeenCalled();
    });

    it('no debe validar firma si el topic no es sensible', () => {
      const req = createMockReqFull({ body: { type: 'merchant_order', data: { id: '123' } } });
      (req as any).headers = {};
      (req as any).query = {};
      const res = createMockRes();

      controller.handleWebhook(req, res);

      expect(mercadoPagoService.validateWebhookSignature).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe extraer el data.id del body cuando no viene en la query', () => {
      const req = createMockReqFull({ body: [{ type: 'payment', data: { id: '999' } }] });
      (req as any).headers = {};
      (req as any).query = {};
      const res = createMockRes();
      mercadoPagoService.validateWebhookSignature.mockReturnValue(true);

      controller.handleWebhook(req, res);

      expect(mercadoPagoService.validateWebhookSignature).toHaveBeenCalledWith(
        expect.objectContaining({ dataId: '999' }),
      );
    });
  });

  describe('getByPreferenceId', () => {
    it('debe devolver payment null si no existe', async () => {
      paymentRepository.findByMpPreferenceId.mockResolvedValue(null);
      const req = createMockReqFull({ params: { preferenceId: 'pref-x' } });
      const res = createMockRes();

      await controller.getByPreferenceId(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ payment: null }));
    });

    it('debe devolver el pago si el usuario autenticado es el dueño', async () => {
      paymentRepository.findByMpPreferenceId.mockResolvedValue(makePayment({ userId: 'user-1' }));
      const req = createMockReqFull({ params: { preferenceId: 'pref-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getByPreferenceId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ payment: expect.objectContaining({ id: 'pay-1' }) }));
    });

    it('debe responder 403 si el usuario autenticado no es dueño ni admin', async () => {
      paymentRepository.findByMpPreferenceId.mockResolvedValue(makePayment({ userId: 'otro-user' }));
      const req = createMockReqFull({ params: { preferenceId: 'pref-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getByPreferenceId(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('debe responder 401 si no hay usuario autenticado y el pago tiene un userId real', async () => {
      paymentRepository.findByMpPreferenceId.mockResolvedValue(makePayment({ userId: 'user-1' }));
      const req = createMockReqFull({ params: { preferenceId: 'pref-1' } });
      const res = createMockRes();

      await controller.getByPreferenceId(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('debe permitir ver el pago sin autenticación si es de una orden manual', async () => {
      paymentRepository.findByMpPreferenceId.mockResolvedValue(makePayment({ userId: 'manual_123' }));
      const req = createMockReqFull({ params: { preferenceId: 'pref-1' } });
      const res = createMockRes();

      await controller.getByPreferenceId(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ payment: expect.objectContaining({ id: 'pay-1' }) }));
    });
  });

  describe('getById', () => {
    it('debe devolver el pago si el usuario es dueño', async () => {
      paymentRepository.findById.mockResolvedValue(makePayment({ userId: 'user-1' }));
      const req = createMockReqFull({ params: { id: 'pay-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 404 si el pago no existe', async () => {
      paymentRepository.findById.mockResolvedValue(null);
      const req = createMockReqFull({ params: { id: 'pay-x' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('debe responder 403 si el usuario no es dueño ni admin', async () => {
      paymentRepository.findById.mockResolvedValue(makePayment({ userId: 'otro-user' }));
      const req = createMockReqFull({ params: { id: 'pay-1' } });
      (req as any).user = { _id: 'user-1', kind: 'Registrado' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('un admin debe poder ver el pago de otro usuario', async () => {
      paymentRepository.findById.mockResolvedValue(makePayment({ userId: 'otro-user' }));
      const req = createMockReqFull({ params: { id: 'pay-1' } });
      (req as any).user = { _id: 'admin-1', kind: 'Admin' };
      const res = createMockRes();

      await controller.getById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getByReference', () => {
    it('debe devolver el pago asociado a la referencia', async () => {
      paymentRepository.findByReference.mockResolvedValue(makePayment());
      const req = createMockReqFull({ params: { referenceId: 'order-1' }, query: { type: 'product_order' } });
      const res = createMockRes();

      await controller.getByReference(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ payment: expect.objectContaining({ id: 'pay-1' }) }));
    });

    it('debe devolver null si no hay pago para la referencia', async () => {
      paymentRepository.findByReference.mockResolvedValue(null);
      const req = createMockReqFull({ params: { referenceId: 'order-x' }, query: {} });
      const res = createMockRes();

      await controller.getByReference(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ payment: null }));
    });
  });

  describe('getAll', () => {
    it('debe listar pagos paginados con valores por defecto', async () => {
      paymentRepository.findAll.mockResolvedValue({ data: [makePayment()], total: 1, page: 1, totalPages: 1, limit: 20 });
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(paymentRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));
    });

    it('debe responder 500 si el repositorio falla', async () => {
      paymentRepository.findAll.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
