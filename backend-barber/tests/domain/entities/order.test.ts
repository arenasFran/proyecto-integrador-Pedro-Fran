import { Order } from '../../../src/domain/entities/Order';
import { AppError } from '../../../src/domain/errors/AppError';

describe('Order entity', () => {
  const makeItems = () => [
    { productId: 'p1', name: 'Cera', price: 100, quantity: 2 },
    { productId: 'p2', name: 'Gel', price: 50, quantity: 1 },
  ];

  describe('create', () => {
    it('debe calcular el total sumando price * quantity de cada item', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      expect(order.total).toBe(250);
    });

    it('debe crear la orden con status pending y un registro inicial en el historial', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      expect(order.status).toBe('pending');
      expect(order.statusHistory).toHaveLength(1);
      expect(order.statusHistory[0]).toMatchObject({ status: 'pending', actor: 'system' });
    });

    it('debe copiar los items sin mantener referencia al array original', () => {
      const items = makeItems();
      const order = Order.create({ userId: 'u1', items });
      items[0].quantity = 99;
      expect(order.items[0].quantity).toBe(2);
    });
  });

  describe('pay', () => {
    it('debe cambiar el status a paid y guardar el paymentId', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.pay('pay-1');
      expect(order.status).toBe('paid');
      expect(order.paymentId).toBe('pay-1');
      expect(order.statusHistory).toHaveLength(2);
    });

    it('debe permitir pagar sin especificar paymentId', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.pay();
      expect(order.status).toBe('paid');
      expect(order.paymentId).toBeUndefined();
    });

    it('debe lanzar error si la orden no está pendiente', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.pay();
      expect(() => order.pay()).toThrow(AppError);
      expect(() => order.pay()).toThrow(/pendientes/);
    });
  });

  describe('deliver', () => {
    it('debe marcar como delivered una orden pendiente', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.deliver();
      expect(order.status).toBe('delivered');
    });

    it('debe marcar como delivered una orden paga', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.pay();
      order.deliver();
      expect(order.status).toBe('delivered');
    });

    it('debe lanzar error si la orden ya fue entregada', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.deliver();
      expect(() => order.deliver()).toThrow(AppError);
    });
  });

  describe('cancel', () => {
    it('debe cancelar una orden pendiente registrando el actor', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.cancel('admin-1');
      expect(order.status).toBe('cancelled');
      expect(order.statusHistory[1].actor).toBe('admin-1');
    });

    it('debe usar "system" como actor por defecto', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.cancel();
      expect(order.statusHistory[1].actor).toBe('system');
    });

    it.each(['delivered', 'cancelled', 'refunded'] as const)(
      'debe lanzar error si la orden está %s',
      (finalStatus) => {
        const order = Order.create({ userId: 'u1', items: makeItems() });
        if (finalStatus === 'delivered') order.deliver();
        if (finalStatus === 'cancelled') order.cancel();
        if (finalStatus === 'refunded') {
          order.pay();
          order.refund();
        }
        expect(() => order.cancel()).toThrow(AppError);
      },
    );
  });

  describe('refund', () => {
    it('debe reembolsar una orden paga', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.pay();
      order.refund();
      expect(order.status).toBe('refunded');
    });

    it('debe lanzar error si la orden no está paga', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      expect(() => order.refund()).toThrow(AppError);
      expect(() => order.refund()).toThrow(/pagas/);
    });
  });

  describe('markStockIssue', () => {
    it('debe cambiar el status a stock_issue', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.markStockIssue();
      expect(order.status).toBe('stock_issue');
      expect(order.statusHistory).toHaveLength(2);
    });
  });

  describe('markAsDisputed', () => {
    it('debe cambiar el status a disputed', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.markAsDisputed();
      expect(order.status).toBe('disputed');
    });
  });

  describe('updateMpMetadata', () => {
    it('debe actualizar mpPaymentId, mpStatusDetail y paymentMethod', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.updateMpMetadata('mp-1', 'accredited', 'credit_card');
      expect(order.paymentId).toBeUndefined();
      expect(order.toPrimitives().mpPaymentId).toBe('mp-1');
      expect(order.toPrimitives().mpStatusDetail).toBe('accredited');
      expect(order.toPrimitives().paymentMethod).toBe('credit_card');
    });

    it('debe permitir omitir mpStatusDetail y paymentMethod', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      order.updateMpMetadata('mp-1');
      expect(order.toPrimitives().mpPaymentId).toBe('mp-1');
      expect(order.toPrimitives().mpStatusDetail).toBeUndefined();
    });
  });

  describe('restore', () => {
    it('debe reconstruir una orden a partir de props persistidas', () => {
      const now = new Date();
      const order = Order.restore({
        id: 'ord-1',
        userId: 'u1',
        items: makeItems(),
        total: 250,
        status: 'paid',
        statusHistory: [{ status: 'pending', timestamp: now, actor: 'system' }],
        createdAt: now,
        updatedAt: now,
      });
      expect(order.id).toBe('ord-1');
      expect(order.status).toBe('paid');
    });
  });

  describe('toPrimitives', () => {
    it('debe devolver un objeto plano con las propiedades de la orden', () => {
      const order = Order.create({ userId: 'u1', items: makeItems() });
      const primitives = order.toPrimitives();
      expect(primitives).toMatchObject({ userId: 'u1', total: 250, status: 'pending' });
    });
  });
});
