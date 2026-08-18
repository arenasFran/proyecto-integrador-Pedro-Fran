import { AnalyticsController, resolvePreset } from '../../../src/interface-adapters/controllers/analytics/AnalyticsController';
import { createMockReqFull, createMockRes } from '../../test-utils/expressMocks';

const makeRepository = () => ({
  getOverview: jest.fn(),
  getHeatmap: jest.fn(),
  getDistribucion: jest.fn(),
  getAvailableYears: jest.fn(),
  getHorasDistribution: jest.fn(),
  getDiasSemanaDistribution: jest.fn(),
  getClientesRecurrentes: jest.fn(),
  getIngresosPorServicio: jest.fn(),
  getClientesList: jest.fn(),
  getNuevosClientes: jest.fn(),
  getClientAppointments: jest.fn(),
  getReservasGanancias: jest.fn(),
  getEcommerceOverview: jest.fn(),
  getProductPerformance: jest.fn(),
  getMembershipRevenue: jest.fn(),
});

describe('resolvePreset', () => {
  it('hoy: debe devolver el mismo día para desde y hasta', () => {
    const { desde, hasta } = resolvePreset('hoy');
    expect(desde).toBe(hasta.slice(0, 10));
  });

  it('ayer: debe devolver el día anterior', () => {
    const hoy = resolvePreset('hoy').desde;
    const { desde } = resolvePreset('ayer');
    expect(new Date(desde).getTime()).toBeLessThan(new Date(hoy).getTime());
  });

  it('semana: debe devolver un rango de lunes a domingo', () => {
    const { desde, hasta } = resolvePreset('semana');
    const diffDays = (new Date(hasta).getTime() - new Date(desde).getTime()) / 86_400_000;
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThan(7);
  });

  it('mes: debe devolver desde el día 1 hasta el último día del mes', () => {
    const { desde } = resolvePreset('mes');
    expect(desde.endsWith('-01')).toBe(true);
  });

  it('year: debe devolver desde el 1 de enero hasta el 31 de diciembre', () => {
    const { desde, hasta } = resolvePreset('year');
    expect(desde.endsWith('-01-01')).toBe(true);
    expect(hasta.startsWith(desde.slice(0, 4))).toBe(true);
    expect(hasta).toContain('-12-31');
  });

  it('preset desconocido: debe devolver strings vacíos', () => {
    expect(resolvePreset('bogus')).toEqual({ desde: '', hasta: '' });
  });
});

describe('AnalyticsController', () => {
  let repository: ReturnType<typeof makeRepository>;
  let controller: AnalyticsController;

  beforeEach(() => {
    repository = makeRepository();
    controller = new AnalyticsController(repository as any);
  });

  describe('getOverviewHandler', () => {
    it('debe usar desde/hasta cuando se proveen', async () => {
      repository.getOverview.mockResolvedValue({ total: 10 });
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getOverviewHandler(req, res);

      expect(repository.getOverview).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 10 }));
    });

    it('debe resolver el preset cuando se provee en vez de desde/hasta', async () => {
      repository.getOverview.mockResolvedValue({ total: 5 });
      const req = createMockReqFull({ query: { preset: 'hoy' } });
      const res = createMockRes();

      await controller.getOverviewHandler(req, res);

      expect(repository.getOverview).toHaveBeenCalled();
    });

    it('debe responder con error si no hay preset ni desde/hasta', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getOverviewHandler(req, res);

      expect(repository.getOverview).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('debe responder 500 si el repositorio falla', async () => {
      repository.getOverview.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getOverviewHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getHeatmapHandler', () => {
    it('debe devolver el heatmap cuando se provee year', async () => {
      repository.getHeatmap.mockResolvedValue([]);
      const req = createMockReqFull({ query: { year: '2026' } });
      const res = createMockRes();

      await controller.getHeatmapHandler(req, res);

      expect(repository.getHeatmap).toHaveBeenCalledWith({ year: 2026, lastYear: undefined });
    });

    it('debe devolver error si no hay year ni lastYear', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getHeatmapHandler(req, res);

      expect(repository.getHeatmap).not.toHaveBeenCalled();
    });
  });

  describe('getDistribucionHandler', () => {
    it('debe devolver la distribución por barbero', async () => {
      repository.getDistribucion.mockResolvedValue([{ barberId: 'b1', cantidad: 3 }]);
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getDistribucionHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ byBarber: [{ barberId: 'b1', cantidad: 3 }] }));
    });

    it('debe devolver error si faltan desde/hasta', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getDistribucionHandler(req, res);

      expect(repository.getDistribucion).not.toHaveBeenCalled();
    });
  });

  describe('getYearsHandler', () => {
    it('debe devolver los años disponibles', async () => {
      repository.getAvailableYears.mockResolvedValue([2024, 2025]);
      const req = createMockReqFull({});
      const res = createMockRes();

      await controller.getYearsHandler(req, res);

      expect(res.json).toHaveBeenCalledWith([2024, 2025]);
    });

    it('debe responder 500 si falla', async () => {
      repository.getAvailableYears.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({});
      const res = createMockRes();

      await controller.getYearsHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getHorasDistributionHandler', () => {
    it('debe delegar en el repositorio con barberId opcional', async () => {
      repository.getHorasDistribution.mockResolvedValue([]);
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31', barberId: 'b1' } });
      const res = createMockRes();

      await controller.getHorasDistributionHandler(req, res);

      expect(repository.getHorasDistribution).toHaveBeenCalledWith('2026-01-01', '2026-01-31', 'b1');
    });

    it('debe devolver error si faltan fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getHorasDistributionHandler(req, res);

      expect(repository.getHorasDistribution).not.toHaveBeenCalled();
    });
  });

  describe('getDiasSemanaDistributionHandler', () => {
    it('debe delegar en el repositorio', async () => {
      repository.getDiasSemanaDistribution.mockResolvedValue([]);
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getDiasSemanaDistributionHandler(req, res);

      expect(repository.getDiasSemanaDistribution).toHaveBeenCalledWith('2026-01-01', '2026-01-31', undefined);
    });

    it('debe devolver error si faltan fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getDiasSemanaDistributionHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getClientesRecurrentesHandler', () => {
    it('debe delegar en el repositorio', async () => {
      repository.getClientesRecurrentes.mockResolvedValue({ tasaRetorno: 0.5 });
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getClientesRecurrentesHandler(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ tasaRetorno: 0.5 }));
    });

    it('debe devolver error si faltan fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getClientesRecurrentesHandler(req, res);

      expect(repository.getClientesRecurrentes).not.toHaveBeenCalled();
    });
  });

  describe('getIngresosPorServicioHandler', () => {
    it('debe delegar en el repositorio', async () => {
      repository.getIngresosPorServicio.mockResolvedValue([]);
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getIngresosPorServicioHandler(req, res);

      expect(repository.getIngresosPorServicio).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    });

    it('debe devolver error si faltan fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getIngresosPorServicioHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getClientesListHandler', () => {
    it('debe delegar en el repositorio con search opcional', async () => {
      repository.getClientesList.mockResolvedValue([]);
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31', search: 'juan' } });
      const res = createMockRes();

      await controller.getClientesListHandler(req, res);

      expect(repository.getClientesList).toHaveBeenCalledWith('2026-01-01', '2026-01-31', 'juan');
    });

    it('debe delegar en el repositorio sin fechas para traer toda la data', async () => {
      repository.getClientesList.mockResolvedValue([]);
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getClientesListHandler(req, res);

      expect(repository.getClientesList).toHaveBeenCalledWith(undefined, undefined, undefined);
    });

    it('debe devolver error si falta solo una de las fechas', async () => {
      const req = createMockReqFull({ query: { desde: '2026-01-01' } });
      const res = createMockRes();

      await controller.getClientesListHandler(req, res);

      expect(repository.getClientesList).not.toHaveBeenCalled();
    });

    it('debe responder 500 si el repositorio falla', async () => {
      repository.getClientesList.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getClientesListHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getNuevosClientesHandler', () => {
    it('debe delegar en el repositorio', async () => {
      repository.getNuevosClientes.mockResolvedValue([]);
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getNuevosClientesHandler(req, res);

      expect(repository.getNuevosClientes).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    });

    it('debe devolver error si faltan fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getNuevosClientesHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getClientAppointmentsHandler', () => {
    it('debe delegar en el repositorio con el clientKey', async () => {
      repository.getClientAppointments.mockResolvedValue([]);
      const req = createMockReqFull({ params: { clientKey: 'client-1' } });
      const res = createMockRes();

      await controller.getClientAppointmentsHandler(req, res);

      expect(repository.getClientAppointments).toHaveBeenCalledWith('client-1');
    });

    it('debe devolver error si falta clientKey', async () => {
      const req = createMockReqFull({ params: {} });
      const res = createMockRes();

      await controller.getClientAppointmentsHandler(req, res);

      expect(repository.getClientAppointments).not.toHaveBeenCalled();
    });
  });

  describe('getReservasGananciasHandler', () => {
    it('debe delegar en el repositorio con granularidad por defecto diario', async () => {
      repository.getReservasGanancias.mockResolvedValue([]);
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getReservasGananciasHandler(req, res);

      expect(repository.getReservasGanancias).toHaveBeenCalledWith(
        expect.objectContaining({ granularidad: 'diario' }),
      );
    });

    it('debe devolver error si faltan fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getReservasGananciasHandler(req, res);

      expect(repository.getReservasGanancias).not.toHaveBeenCalled();
    });
  });

  describe('getEcommerceOverviewHandler', () => {
    it('debe resolver preset y delegar en el repositorio', async () => {
      repository.getEcommerceOverview.mockResolvedValue({});
      const req = createMockReqFull({ query: { preset: 'mes' } });
      const res = createMockRes();

      await controller.getEcommerceOverviewHandler(req, res);

      expect(repository.getEcommerceOverview).toHaveBeenCalled();
    });

    it('debe devolver error si no hay preset ni fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getEcommerceOverviewHandler(req, res);

      expect(repository.getEcommerceOverview).not.toHaveBeenCalled();
    });
  });

  describe('getProductPerformanceHandler', () => {
    it('debe delegar en el repositorio', async () => {
      repository.getProductPerformance.mockResolvedValue({});
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getProductPerformanceHandler(req, res);

      expect(repository.getProductPerformance).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    });

    it('debe devolver error si no hay preset ni fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getProductPerformanceHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getMembershipRevenueHandler', () => {
    it('debe delegar en el repositorio', async () => {
      repository.getMembershipRevenue.mockResolvedValue([]);
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getMembershipRevenueHandler(req, res);

      expect(repository.getMembershipRevenue).toHaveBeenCalledWith('2026-01-01', '2026-01-31');
    });

    it('debe devolver error si no hay preset ni fechas', async () => {
      const req = createMockReqFull({ query: {} });
      const res = createMockRes();

      await controller.getMembershipRevenueHandler(req, res);

      expect(repository.getMembershipRevenue).not.toHaveBeenCalled();
    });

    it('debe responder 500 si el repositorio falla', async () => {
      repository.getMembershipRevenue.mockRejectedValue(new Error('db down'));
      const req = createMockReqFull({ query: { desde: '2026-01-01', hasta: '2026-01-31' } });
      const res = createMockRes();

      await controller.getMembershipRevenueHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
