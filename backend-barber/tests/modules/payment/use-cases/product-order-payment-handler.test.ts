import { ProductOrderPaymentHandler } from '../../../../src/application/use-cases/payment/handlers/ProductOrderPaymentHandler';
import { Order } from '../../../../src/domain/entities/Order';
import { Payment } from '../../../../src/domain/entities/Payment';
import {
  makeMockOrderRepository,
  makeMockProductRepository,
  makeMockEmailService,
  makeMockUserRepository,
} from '../../../test-utils/mocks';

const makeOrder = (overrides?: Partial<{ status: 'pending' | 'paid' | 'delivered' | 'cancelled' | 'refunded' | 'disputed' | 'stock_issue' }>) =>
  Order.restore({
    id: 'order-1',
    userId: 'user-1',
    items: [
      { productId: 'prod-1', name: 'Cera', price: 100, quantity: 2 },
      { productId: 'prod-2', name: 'Gel', price: 50, quantity: 1 },
    ],
    total: 250,
    status: overrides?.status ?? 'pending',
    statusHistory: [{ status: 'pending', timestamp: new Date(), actor: 'system' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makePayment = (overrides?: Record<string, unknown>) =>
  Payment.restore({
    id: 'pay-1',
    type: 'product_order',
    referenceId: 'order-1',
    status: 'approved',
    mpPaymentId: 'mp-1',
    mpPreferenceId: 'pref-1',
    amount: 250,
    currency: 'UYU',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe('ProductOrderPaymentHandler', () => {
  let orderRepository: ReturnType<typeof makeMockOrderRepository>;
  let productRepository: ReturnType<typeof makeMockProductRepository>;
  let emailService: ReturnType<typeof makeMockEmailService>;
  let userRepository: ReturnType<typeof makeMockUserRepository>;
  let handler: ProductOrderPaymentHandler;

  beforeEach(() => {
    orderRepository = makeMockOrderRepository();
    productRepository = makeMockProductRepository();
    emailService = makeMockEmailService();
    userRepository = makeMockUserRepository();
    productRepository.atomicDecreaseStock.mockResolvedValue(true);
    orderRepository.save.mockImplementation(async (o: any) => o);

    handler = new ProductOrderPaymentHandler(
      orderRepository as any,
      productRepository as any,
      emailService as any,
      userRepository as any,
    );
  });

  describe('handleApproved', () => {
    it('debe pagar la orden y descontar stock de cada item cuando hay stock disponible', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      const payment = makePayment();

      await handler.handleApproved(payment, 'accredited', 'credit_card');

      expect(order.status).toBe('paid');
      expect(productRepository.atomicDecreaseStock).toHaveBeenCalledWith('prod-1', 2, expect.anything());
      expect(productRepository.atomicDecreaseStock).toHaveBeenCalledWith('prod-2', 1, expect.anything());
      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('debe marcar stock_issue y revertir el stock ya descontado si algún item no tiene stock', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      productRepository.atomicDecreaseStock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await handler.handleApproved(makePayment());

      expect(order.status).toBe('stock_issue');
      expect(productRepository.atomicIncreaseStock).toHaveBeenCalledWith('prod-1', 2, expect.anything());
      expect(productRepository.atomicIncreaseStock).not.toHaveBeenCalledWith('prod-2', 1, expect.anything());
    });

    it('no debe hacer nada si la orden no existe', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await handler.handleApproved(makePayment());

      expect(productRepository.atomicDecreaseStock).not.toHaveBeenCalled();
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('no debe hacer nada si la orden ya no está pendiente', async () => {
      const order = makeOrder({ status: 'paid' });
      orderRepository.findById.mockResolvedValue(order);

      await handler.handleApproved(makePayment());

      expect(productRepository.atomicDecreaseStock).not.toHaveBeenCalled();
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('debe enviar un email de confirmación cuando hay emailService y el usuario tiene email', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      userRepository.findEmailById.mockResolvedValue('cliente@test.com');

      await handler.handleApproved(makePayment());

      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'cliente@test.com', subject: expect.stringContaining('Pago aprobado') }),
      );
    });

    it('no debe intentar enviar email si no hay userRepository', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      handler = new ProductOrderPaymentHandler(orderRepository as any, productRepository as any, emailService as any);

      await handler.handleApproved(makePayment());

      expect(emailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('handleRejected', () => {
    it('debe cancelar la orden si está pendiente', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);

      await handler.handleRejected(makePayment({ status: 'rejected' }));

      expect(order.status).toBe('cancelled');
      expect(orderRepository.save).toHaveBeenCalledWith(order);
    });

    it('no debe tocar la orden si ya no está pendiente', async () => {
      const order = makeOrder({ status: 'paid' });
      orderRepository.findById.mockResolvedValue(order);

      await handler.handleRejected(makePayment({ status: 'rejected' }));

      expect(order.status).toBe('paid');
      expect(orderRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('handleCancelled', () => {
    it('debe cancelar la orden si está pendiente', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);

      await handler.handleCancelled(makePayment({ status: 'cancelled' }));

      expect(order.status).toBe('cancelled');
    });

    it('no debe tocar la orden si no existe', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await handler.handleCancelled(makePayment({ status: 'cancelled' }));

      expect(orderRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('handleRefunded', () => {
    it('debe reembolsar la orden paga y restaurar el stock', async () => {
      const order = makeOrder({ status: 'paid' });
      orderRepository.findById.mockResolvedValue(order);

      await handler.handleRefunded(makePayment({ status: 'refunded' }), 'refunded', 'credit_card');

      expect(order.status).toBe('refunded');
      expect(productRepository.atomicIncreaseStock).toHaveBeenCalledWith('prod-1', 2, expect.anything());
      expect(productRepository.atomicIncreaseStock).toHaveBeenCalledWith('prod-2', 1, expect.anything());
    });

    it('no debe hacer nada si la orden no está paga', async () => {
      const order = makeOrder({ status: 'pending' });
      orderRepository.findById.mockResolvedValue(order);

      await handler.handleRefunded(makePayment({ status: 'refunded' }));

      expect(order.status).toBe('pending');
      expect(productRepository.atomicIncreaseStock).not.toHaveBeenCalled();
      expect(orderRepository.save).not.toHaveBeenCalled();
    });

    it('debe enviar email de reembolso cuando hay emailService y el usuario tiene email', async () => {
      const order = makeOrder({ status: 'paid' });
      orderRepository.findById.mockResolvedValue(order);
      userRepository.findEmailById.mockResolvedValue('cliente@test.com');

      await handler.handleRefunded(makePayment({ status: 'refunded' }));

      expect(emailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'cliente@test.com', subject: expect.stringContaining('Reembolso') }),
      );
    });
  });

  describe('handleChargeBack', () => {
    it('debe marcar la orden como disputada', async () => {
      const order = makeOrder({ status: 'paid' });
      orderRepository.findById.mockResolvedValue(order);

      await handler.handleChargeBack(makePayment({ status: 'charge_back' }), 'detail', 'credit_card');

      expect(order.status).toBe('disputed');
      expect(orderRepository.save).toHaveBeenCalledWith(order);
    });

    it('no debe hacer nada si la orden no existe', async () => {
      orderRepository.findById.mockResolvedValue(null);

      await handler.handleChargeBack(makePayment());

      expect(orderRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('handleInMediation', () => {
    it('debe marcar la orden como disputada', async () => {
      const order = makeOrder({ status: 'paid' });
      orderRepository.findById.mockResolvedValue(order);

      await handler.handleInMediation(makePayment({ status: 'in_mediation' }));

      expect(order.status).toBe('disputed');
    });
  });

  describe('manejo de errores al buscar el email del usuario', () => {
    it('no debe romper el flujo si findEmailById lanza un error', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      userRepository.findEmailById.mockRejectedValue(new Error('boom'));

      await expect(handler.handleApproved(makePayment())).resolves.toBeUndefined();
      expect(emailService.sendMail).not.toHaveBeenCalled();
    });
  });
});
