import { countPaidOrdersByStatus } from '../../../src/infrastructure/repositories/mongodb/MongoAnalyticsRepository';

describe('countPaidOrdersByStatus', () => {
  it('cuenta órdenes pagadas y entregadas como cobradas', () => {
    expect(countPaidOrdersByStatus({ pending: 2, paid: 3, delivered: 4, cancelled: 1 })).toBe(7);
  });

  it('devuelve cero cuando no hay estados cobrados', () => {
    expect(countPaidOrdersByStatus({ pending: 2, cancelled: 1 })).toBe(0);
  });
});
