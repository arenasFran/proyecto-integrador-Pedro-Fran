import { ProcessWebhookUseCase } from '../../../../src/application/use-cases/payment/ProcessWebhookUseCase';
import { Payment } from '../../../../src/domain/entities/Payment';
import {
  makeMockPaymentRepository,
  makeMockPaymentService,
  makeMockAppointmentRepository,
  makeMockMembershipRepository,
  makeMockOrderRepository,
  makeMockProductRepository,
  makeMockEmailService,
} from '../../../test-utils/mocks';

jest.mock('../../../../src/infrastructure/config/env', () => ({
  getConfig: jest.fn().mockReturnValue({
    mpAccessToken: 'TEST-123',
    mpWebhookSecret: 'my-secret',
    membershipPriceUyu: 500,
  }),
}));

const makePayment = (overrides?: Record<string, unknown>) =>
  Payment.restore({
    id: 'pay-1',
    type: 'appointment',
    referenceId: 'ref-1',
    status: 'pending',
    mpPaymentId: undefined,
    mpPreferenceId: 'pref-123',
    amount: 500,
    currency: 'UYU',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeMpPayment = (overrides?: Record<string, unknown>) => ({
  id: '123456',
  status: 'approved',
  statusDetail: 'accredited',
  transactionAmount: 500,
  paymentMethodId: 'master',
  payerEmail: 'buyer@test.com',
  externalReference: 'ref-1',
  preapprovalId: undefined,
  ...overrides,
});

describe('ProcessWebhookUseCase', () => {
  let paymentRepository: ReturnType<typeof makeMockPaymentRepository>;
  let paymentService: ReturnType<typeof makeMockPaymentService>;
  let appointmentRepository: ReturnType<typeof makeMockAppointmentRepository>;
  let membershipRepository: ReturnType<typeof makeMockMembershipRepository>;
  let orderRepository: ReturnType<typeof makeMockOrderRepository>;
  let productRepository: ReturnType<typeof makeMockProductRepository>;
  let emailService: ReturnType<typeof makeMockEmailService>;
  let useCase: ProcessWebhookUseCase;

  beforeEach(() => {
    paymentRepository = makeMockPaymentRepository();
    paymentService = makeMockPaymentService();
    appointmentRepository = makeMockAppointmentRepository();
    membershipRepository = makeMockMembershipRepository();
    orderRepository = makeMockOrderRepository();
    productRepository = makeMockProductRepository();
    emailService = makeMockEmailService();

    useCase = new ProcessWebhookUseCase(
      paymentRepository as any,
      appointmentRepository as any,
      membershipRepository as any,
      orderRepository as any,
      productRepository as any,
      paymentService as any,
      emailService as any,
    );
  });

  describe('validación de entrada', () => {
    it('debe ignorar si el body no tiene data.id', async () => {
      await useCase.execute({ type: 'payment' }, 'x-sig', 'x-req');
      expect(paymentService.getPayment).not.toHaveBeenCalled();
    });

    it('debe ignorar si el body es null/undefined', async () => {
      await useCase.execute(null as any, 'x-sig', 'x-req');
      expect(paymentService.getPayment).not.toHaveBeenCalled();
    });
  });

  describe('topic desconocido', () => {
    it('debe ignorar topics que no son payment ni preapproval', async () => {
      await useCase.execute(
        { type: 'merchant_order', data: { id: '123' }, action: 'updated' },
        'x-sig',
        'x-req',
      );
      expect(paymentService.getPayment).not.toHaveBeenCalled();
    });
  });

  describe('preapproval / subscription', () => {
    const preapprovalPayload = {
      type: 'preapproval',
      data: { id: 'preapp-1' },
      action: 'created',
    };

    it('debe rechazar si HMAC es inválido en preapproval', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(false);

      await expect(
        useCase.execute(preapprovalPayload, 'bad-sig', 'req-id'),
      ).rejects.toThrow('Firma HMAC inválida');
    });

    it('debe ignorar si preapproval no se encuentra en MP', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
      paymentService.getPreapproval.mockResolvedValue(null as any);

      await useCase.execute(preapprovalPayload, 'x-sig', 'x-req');
      expect(membershipRepository.save).not.toHaveBeenCalled();
    });

    it('debe ignorar si preapproval no está authorized', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
      paymentService.getPreapproval.mockResolvedValue({
        id: 'preapp-1',
        status: 'pending',
        payerEmail: 'test@test.com',
        externalReference: 'user-1',
      });

      await useCase.execute(preapprovalPayload, 'x-sig', 'x-req');
      expect(membershipRepository.save).not.toHaveBeenCalled();
    });

    it('debe crear membresía si preapproval está authorized y no existe', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
      paymentService.getPreapproval.mockResolvedValue({
        id: 'preapp-1',
        status: 'authorized',
        payerEmail: 'test@test.com',
        externalReference: 'user-1',
      });
      membershipRepository.findActiveByUser.mockResolvedValue(null);

      await useCase.execute(preapprovalPayload, 'x-sig', 'x-req');
      expect(membershipRepository.save).toHaveBeenCalledTimes(1);
    });

    it('debe omitir si ya existe membresía activa', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
      paymentService.getPreapproval.mockResolvedValue({
        id: 'preapp-1',
        status: 'authorized',
        payerEmail: 'test@test.com',
        externalReference: 'user-1',
      });
      membershipRepository.findActiveByUser.mockResolvedValue({ id: 'mem-1' } as any);

      await useCase.execute(preapprovalPayload, 'x-sig', 'x-req');
      expect(membershipRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('pago — validación HMAC', () => {
    const paymentPayload = {
      type: 'payment',
      data: { id: '123456' },
      action: 'payment.updated',
    };

    it('debe lanzar error si HMAC es inválido', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(false);

      await expect(
        useCase.execute(paymentPayload, 'bad-sig', 'req-id'),
      ).rejects.toThrow('Firma HMAC inválida');
    });

    it('debe continuar si HMAC es válido', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
      paymentService.getPayment.mockResolvedValue(null);

      await useCase.execute(paymentPayload, 'good-sig', 'req-id');
      expect(paymentService.getPayment).toHaveBeenCalledWith('123456');
    });
  });

  describe('pago no encontrado en MP', () => {
    it('debe ignorar si getPayment devuelve null', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
      paymentService.getPayment.mockResolvedValue(null);

      await useCase.execute(
        { type: 'payment', data: { id: '999' }, action: 'payment.updated' },
        'x-sig',
        'x-req',
      );
      expect(paymentRepository.findByMpPaymentId).not.toHaveBeenCalled();
    });
  });

  describe('pago con preapprovalId (subscription payment)', () => {
    it('debe renovar membresía si el pago está approved y tiene preapprovalId', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
      paymentService.getPayment.mockResolvedValue(
        makeMpPayment({ preapprovalId: 'preapp-1', status: 'approved' }),
      );
      membershipRepository.findByPreapprovalId = jest.fn().mockResolvedValue({
        id: 'mem-1',
        renew: jest.fn(),
      } as any);

      await useCase.execute(
        { type: 'payment', data: { id: '123' }, action: 'payment.updated' },
        'x-sig',
        'x-req',
      );

      expect(membershipRepository.findByPreapprovalId).toHaveBeenCalledWith('preapp-1');
      expect(membershipRepository.save).toHaveBeenCalledTimes(1);
    });

    it('debe ignorar si no se encuentra membresía para el preapprovalId', async () => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
      paymentService.getPayment.mockResolvedValue(
        makeMpPayment({ preapprovalId: 'preapp-99', status: 'approved' }),
      );
      membershipRepository.findByPreapprovalId = jest.fn().mockResolvedValue(null);

      await useCase.execute(
        { type: 'payment', data: { id: '123' }, action: 'payment.updated' },
        'x-sig',
        'x-req',
      );

      expect(membershipRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('flujo de pago completo', () => {
    const paymentPayload = {
      type: 'payment',
      data: { id: '123456' },
      action: 'payment.updated',
    };

    beforeEach(() => {
      paymentService.validateWebhookSignature.mockReturnValue(true);
    });

    it('debe aprobar pago de tipo appointment y marcar turno como Pagado', async () => {
      const payment = makePayment();
      paymentService.getPayment.mockResolvedValue(makeMpPayment({ status: 'approved' }));
      paymentRepository.findByMpPaymentId.mockResolvedValue(payment);
      appointmentRepository.findById.mockResolvedValue({
        id: 'ref-1',
        paymentStatus: 'Pendiente',
        status: 'Confirmado',
        pay: jest.fn(),
      } as any);

      await useCase.execute(paymentPayload, 'x-sig', 'x-req');

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' }),
      );
      expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
        'ref-1',
        expect.objectContaining({ paymentStatus: 'Pagado' }),
      );
    });

    it('debe aprobar pago de tipo membership y crear membresía si no existe', async () => {
      const payment = makePayment({ type: 'membership' });
      paymentService.getPayment.mockResolvedValue(makeMpPayment({ status: 'approved' }));
      paymentRepository.findByMpPaymentId.mockResolvedValue(payment);
      membershipRepository.findActiveByUser.mockResolvedValue(null);

      await useCase.execute(paymentPayload, 'x-sig', 'x-req');

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' }),
      );
      expect(membershipRepository.save).toHaveBeenCalledTimes(1);
    });

    it('debe aprobar pago de tipo product_order y descontar stock', async () => {
      const payment = makePayment({ type: 'product_order' });
      paymentService.getPayment.mockResolvedValue(makeMpPayment({ status: 'approved' }));
      paymentRepository.findByMpPaymentId.mockResolvedValue(payment);
      orderRepository.findById.mockResolvedValue({
        id: 'order-1',
        status: 'pending',
        items: [{ productId: 'prod-1', quantity: 2 }],
        total: 500,
        pay: jest.fn(),
      } as any);

      await useCase.execute(paymentPayload, 'x-sig', 'x-req');

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'approved' }),
      );
      expect(productRepository.atomicDecreaseStock).toHaveBeenCalledWith('prod-1', 2);
      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('debe rechazar pago y cancelar orden de tipo product_order', async () => {
      const payment = makePayment({ type: 'product_order' });
      paymentService.getPayment.mockResolvedValue(makeMpPayment({ status: 'rejected' }));
      paymentRepository.findByMpPaymentId.mockResolvedValue(payment);
      orderRepository.findById.mockResolvedValue({
        id: 'order-1',
        status: 'pending',
        cancel: jest.fn(),
      } as any);

      await useCase.execute(paymentPayload, 'x-sig', 'x-req');

      expect(payment.status).toBe('rejected');
      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'rejected' }),
      );
      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('debe cancelar pago y cancelar orden de tipo product_order', async () => {
      const payment = makePayment({ type: 'product_order' });
      paymentService.getPayment.mockResolvedValue(makeMpPayment({ status: 'cancelled' }));
      paymentRepository.findByMpPaymentId.mockResolvedValue(payment);
      orderRepository.findById.mockResolvedValue({
        id: 'order-1',
        status: 'pending',
        cancel: jest.fn(),
      } as any);

      await useCase.execute(paymentPayload, 'x-sig', 'x-req');

      expect(payment.status).toBe('cancelled');
      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'cancelled' }),
      );
      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('debe ignorar si el pago no existe en la BD local', async () => {
      paymentService.getPayment.mockResolvedValue(makeMpPayment({ status: 'approved' }));
      paymentRepository.findByMpPaymentId.mockResolvedValue(null);
      paymentRepository.findById.mockResolvedValue(null);

      await useCase.execute(paymentPayload, 'x-sig', 'x-req');
      expect(paymentRepository.save).not.toHaveBeenCalled();
    });

    it('debe buscar por externalReference si no encuentra por mpPaymentId', async () => {
      const payment = makePayment();
      paymentService.getPayment.mockResolvedValue(
        makeMpPayment({ status: 'approved', externalReference: 'pay-1' }),
      );
      paymentRepository.findByMpPaymentId.mockResolvedValue(null);
      paymentRepository.findById.mockResolvedValue(payment);
      appointmentRepository.findById.mockResolvedValue({
        id: 'ref-1',
        paymentStatus: 'Pendiente',
        pay: jest.fn(),
      } as any);

      await useCase.execute(paymentPayload, 'x-sig', 'x-req');
      expect(paymentRepository.findById).toHaveBeenCalledWith('pay-1');
      expect(paymentRepository.save).toHaveBeenCalled();
    });
  });
});
