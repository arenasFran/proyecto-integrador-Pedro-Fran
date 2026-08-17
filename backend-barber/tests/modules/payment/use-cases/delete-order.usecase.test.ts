import { DeleteOrderUseCase } from '../../../../src/application/use-cases/product/DeleteOrderUseCase';
import { Order } from '../../../../src/domain/entities/Order';
import { Payment } from '../../../../src/domain/entities/Payment';
import { AppError } from '../../../../src/domain/errors/AppError';
import { makeMockOrderRepository, makeMockPaymentRepository } from '../../../test-utils/mocks';

const makeOrder = (status: 'pending' | 'paid' | 'cancelled' | 'stock_issue' = 'pending') => Order.restore({
  id: 'order-1',
  userId: 'user-1',
  items: [{ productId: 'prod-1', name: 'Cera', price: 100, quantity: 1 }],
  total: 100,
  status,
  statusHistory: [{ status: 'pending', timestamp: new Date(), actor: 'system' }],
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makePayment = (status: 'pending' | 'approved') => Payment.restore({
  id: 'payment-1',
  type: 'product_order',
  referenceId: 'order-1',
  status,
  amount: 100,
  currency: 'UYU',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('DeleteOrderUseCase', () => {
  it('elimina una orden pendiente y cancela su payment pendiente', async () => {
    const orderRepository = makeMockOrderRepository();
    const paymentRepository = makeMockPaymentRepository();
    orderRepository.findById.mockResolvedValue(makeOrder());
    paymentRepository.findByReference.mockResolvedValue(makePayment('pending'));
    const useCase = new DeleteOrderUseCase(orderRepository as any, paymentRepository as any);

    await useCase.execute({ orderId: 'order-1' });

    expect(paymentRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    expect(orderRepository.delete).toHaveBeenCalledWith('order-1');
  });

  it('rechaza eliminar una orden con impacto financiero', async () => {
    const orderRepository = makeMockOrderRepository();
    const paymentRepository = makeMockPaymentRepository();
    orderRepository.findById.mockResolvedValue(makeOrder('paid'));
    const useCase = new DeleteOrderUseCase(orderRepository as any, paymentRepository as any);

    await expect(useCase.execute({ orderId: 'order-1' })).rejects.toThrow(AppError);
    expect(orderRepository.delete).not.toHaveBeenCalled();
  });

  it('rechaza eliminar si existe un payment aprobado', async () => {
    const orderRepository = makeMockOrderRepository();
    const paymentRepository = makeMockPaymentRepository();
    orderRepository.findById.mockResolvedValue(makeOrder('pending'));
    paymentRepository.findByReference.mockResolvedValue(makePayment('approved'));
    const useCase = new DeleteOrderUseCase(orderRepository as any, paymentRepository as any);

    await expect(useCase.execute({ orderId: 'order-1' })).rejects.toThrow(/pago aprobado/);
    expect(orderRepository.delete).not.toHaveBeenCalled();
  });
});
