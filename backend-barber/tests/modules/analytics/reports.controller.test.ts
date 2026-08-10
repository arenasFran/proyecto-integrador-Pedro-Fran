import { ReportsController } from '../../../src/interface-adapters/controllers/reports/ReportsController';
import { createMockReqFull, createMockRes } from '../../test-utils/expressMocks';

describe('ReportsController', () => {
  let exportOrdersCsvUseCase: { execute: jest.Mock };
  let exportSalesCsvUseCase: { execute: jest.Mock };
  let exportProductsCsvUseCase: { execute: jest.Mock };
  let exportMembershipsCsvUseCase: { execute: jest.Mock };
  let controller: ReportsController;

  beforeEach(() => {
    exportOrdersCsvUseCase = { execute: jest.fn() };
    exportSalesCsvUseCase = { execute: jest.fn() };
    exportProductsCsvUseCase = { execute: jest.fn() };
    exportMembershipsCsvUseCase = { execute: jest.fn() };
    controller = new ReportsController(
      exportOrdersCsvUseCase as any,
      exportSalesCsvUseCase as any,
      exportProductsCsvUseCase as any,
      exportMembershipsCsvUseCase as any,
    );
  });

  describe('exportOrdersCsv', () => {
    it('debe devolver el CSV con los headers correctos', async () => {
      exportOrdersCsvUseCase.execute.mockResolvedValue('id,total\n1,100');
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31', status: 'paid' } });
      const res = createMockRes();

      await controller.exportOrdersCsv(req, res);

      expect(exportOrdersCsvUseCase.execute).toHaveBeenCalledWith({ desde: '2026-01-01', hasta: '2026-01-31', status: 'paid' });
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('id,total\n1,100');
    });

    it('debe responder 500 si falla', async () => {
      exportOrdersCsvUseCase.execute.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.exportOrdersCsv(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('exportSalesCsv', () => {
    it('debe devolver el CSV de ventas', async () => {
      exportSalesCsvUseCase.execute.mockResolvedValue('fecha,total\n2026-01-01,500');
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.exportSalesCsv(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('fecha,total\n2026-01-01,500');
    });

    it('debe responder 500 si falla', async () => {
      exportSalesCsvUseCase.execute.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.exportSalesCsv(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('exportProductsCsv', () => {
    it('debe devolver el CSV de productos', async () => {
      exportProductsCsvUseCase.execute.mockResolvedValue('nombre,stock\nCera,10');
      const req = createMockReqFull({});
      const res = createMockRes();

      await controller.exportProductsCsv(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith('nombre,stock\nCera,10');
    });

    it('debe responder 500 si falla', async () => {
      exportProductsCsvUseCase.execute.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({});
      const res = createMockRes();

      await controller.exportProductsCsv(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('exportMembershipsCsv', () => {
    it('debe devolver el CSV de membresías', async () => {
      exportMembershipsCsvUseCase.execute.mockResolvedValue('id,status\nmem-1,active');
      const req = createMockReqFull({ query: { status: 'active' } });
      const res = createMockRes();

      await controller.exportMembershipsCsv(req, res);

      expect(exportMembershipsCsvUseCase.execute).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('debe responder 500 si falla', async () => {
      exportMembershipsCsvUseCase.execute.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.exportMembershipsCsv(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
