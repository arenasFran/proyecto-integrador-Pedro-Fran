import { UpdateOrderStatusUseCase } from '../../../../src/application/use-cases/product/UpdateOrderStatusUseCase';
import { Order } from '../../../../src/domain/entities/Order';
import { Payment } from '../../../../src/domain/entities/Payment';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockOrderRepository, makeMockPaymentRepository } from '../../../test-utils/mocks';

const makeOrder = (overrides?: Partial<{ status: 'pending' | 'paid' | 'delivered' | 'cancelled'; paymentId: string }>) =>
  Order.restore({
    id: 'order-1',
    userId: 'user-1',
    items: [{ productId: 'prod-1', name: 'Cera', price: 100, quantity: 2 }],
    total: 200,
    status: overrides?.status ?? 'pending',
    paymentId: overrides?.paymentId,
    statusHistory: [{ status: 'pending', timestamp: new Date(), actor: 'system' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const makePayment = (overrides?: Partial<{ status: 'pending' | 'approved' | 'cancelled' }>) =>
  Payment.restore({
    id: 'pay-1',
    type: 'product_order',
    referenceId: 'order-1',
    status: overrides?.status ?? 'approved',
    mpPaymentId: undefined,
    mpPreferenceId: undefined,
    amount: 200,
    currency: 'UYU',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('UpdateOrderStatusUseCase', () => {
  let orderRepository: ReturnType<typeof makeMockOrderRepository>;
  let paymentRepository: ReturnType<typeof makeMockPaymentRepository>;
  let orderStockService: { restoreStock: jest.Mock; decreaseStock: jest.Mock };
  let revenueTracker: { trackProductOrder: jest.Mock };
  let useCase: UpdateOrderStatusUseCase;

  beforeEach(() => {
    orderRepository = makeMockOrderRepository();
    paymentRepository = makeMockPaymentRepository();
    orderStockService = {
      restoreStock: jest.fn().mockResolvedValue(undefined),
      decreaseStock: jest.fn().mockResolvedValue(true),
    };
    revenueTracker = { trackProductOrder: jest.fn().mockResolvedValue(undefined) };
    orderRepository.save.mockImplementation(async (o: Order) => o);

    useCase = new UpdateOrderStatusUseCase(
      orderRepository as any,
      orderStockService as any,
      paymentRepository as any,
      revenueTracker as any,
    );
  });

  it('debe lanzar error si la orden no existe', async () => {
    orderRepository.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ orderId: 'order-1', status: 'paid', actor: 'admin' }),
    ).rejects.toThrow(/no encontrada/);
  });

  it('debe lanzar error si el status es inválido', async () => {
    orderRepository.findById.mockResolvedValue(makeOrder());
    await expect(
      useCase.execute({ orderId: 'order-1', status: 'bogus', actor: 'admin' }),
    ).rejects.toThrow(AppError);
  });

  it('debe marcar la orden como pagada y devolver el status previo', async () => {
    const order = makeOrder();
    orderRepository.findById.mockResolvedValue(order);
    paymentRepository.findByReference.mockResolvedValue(null);

    const result = await useCase.execute({ orderId: 'order-1', status: 'paid', actor: 'admin' });

    expect(result.previousStatus).toBe('pending');
    expect(result.order.status).toBe('paid');
    expect(revenueTracker.trackProductOrder).toHaveBeenCalled();
  });

  it('debe marcar la orden como entregada', async () => {
    const order = makeOrder({ status: 'paid' });
    orderRepository.findById.mockResolvedValue(order);
    paymentRepository.findByReference.mockResolvedValue(null);

    const result = await useCase.execute({ orderId: 'order-1', status: 'delivered', actor: 'admin' });

    expect(result.order.status).toBe('delivered');
    // ya estaba 'paid' -> el stock ya se había descontado en esa transición, no se vuelve a tocar
    expect(orderStockService.decreaseStock).not.toHaveBeenCalled();
  });

  describe('descuento de stock (transición pending → paid/delivered)', () => {
    it('debe descontar el stock al marcar como pagada por primera vez', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByReference.mockResolvedValue(null);

      const result = await useCase.execute({ orderId: 'order-1', status: 'paid', actor: 'admin' });

      expect(orderStockService.decreaseStock).toHaveBeenCalledWith(order);
      expect(result.order.status).toBe('paid');
    });

    it('debe descontar el stock al marcar directamente como entregada desde pending', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByReference.mockResolvedValue(null);

      await useCase.execute({ orderId: 'order-1', status: 'delivered', actor: 'admin' });

      expect(orderStockService.decreaseStock).toHaveBeenCalledWith(order);
    });

    it('debe marcar la orden como stock_issue si no hay stock suficiente, sin aprobar el payment ni trackear revenue', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      orderStockService.decreaseStock.mockResolvedValue(false);

      const result = await useCase.execute({ orderId: 'order-1', status: 'paid', actor: 'admin' });

      expect(result.order.status).toBe('stock_issue');
      expect(paymentRepository.findByReference).not.toHaveBeenCalled();
      expect(revenueTracker.trackProductOrder).not.toHaveBeenCalled();
    });
  });

  describe('cancelación', () => {
    it('debe cancelar la orden y restaurar el stock', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);

      const result = await useCase.execute({ orderId: 'order-1', status: 'cancelled', actor: 'admin' });

      expect(result.order.status).toBe('cancelled');
      expect(orderStockService.restoreStock).toHaveBeenCalledWith(order);
    });

    it('debe rechazar la cancelación si el payment asociado ya está aprobado', async () => {
      const order = makeOrder({ paymentId: 'pay-1' });
      orderRepository.findById.mockResolvedValue(order);
      const payment = makePayment({ status: 'approved' });
      paymentRepository.findById.mockResolvedValue(payment);

      await expect(
        useCase.execute({ orderId: 'order-1', status: 'cancelled', actor: 'admin' }),
      ).rejects.toThrow(/pago ya aprobado/);

      expect(orderRepository.save).not.toHaveBeenCalled();
      expect(orderStockService.restoreStock).not.toHaveBeenCalled();
    });

    it('debe cancelar el payment asociado si está pending (no aprobado)', async () => {
      const order = makeOrder({ paymentId: 'pay-1' });
      orderRepository.findById.mockResolvedValue(order);
      const payment = makePayment({ status: 'pending' });
      paymentRepository.findById.mockResolvedValue(payment);

      await useCase.execute({ orderId: 'order-1', status: 'cancelled', actor: 'admin' });

      expect(paymentRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    });

    it('debe propagar el error si falla la búsqueda del payment (fail-closed: no cancela si no puede verificar el estado del pago)', async () => {
      const order = makeOrder({ paymentId: 'pay-1' });
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findById.mockRejectedValue(new Error('db down'));

      await expect(
        useCase.execute({ orderId: 'order-1', status: 'cancelled', actor: 'admin' }),
      ).rejects.toThrow('db down');

      expect(orderRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('actualización del Payment al pagar/entregar', () => {
    it('debe aprobar un payment pendiente existente', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      const payment = makePayment({ status: 'pending' });
      paymentRepository.findByReference.mockResolvedValue(payment);

      await useCase.execute({ orderId: 'order-1', status: 'paid', actor: 'admin' });

      expect(paymentRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved' }));
    });

    it('debe crear un payment nuevo si no existe y la orden no tiene paymentId', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByReference.mockResolvedValue(null);

      await useCase.execute({ orderId: 'order-1', status: 'paid', actor: 'admin' });

      expect(paymentRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', referenceId: 'order-1' }));
    });

    it('no debe crear un payment si la orden ya tiene paymentId y no hay uno por referencia', async () => {
      const order = makeOrder({ paymentId: 'pay-1' });
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByReference.mockResolvedValue(null);

      await useCase.execute({ orderId: 'order-1', status: 'paid', actor: 'admin' });

      expect(paymentRepository.save).not.toHaveBeenCalled();
    });

    it('no debe romper el flujo si falla la actualización del payment', async () => {
      const order = makeOrder();
      orderRepository.findById.mockResolvedValue(order);
      paymentRepository.findByReference.mockRejectedValue(new Error('db down'));

      const result = await useCase.execute({ orderId: 'order-1', status: 'paid', actor: 'admin' });

      expect(result.order.status).toBe('paid');
    });
  });
});
