import { describe, expect, it, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

const mockApi = vi.hoisted(() => vi.fn());

vi.mock('./api', () => ({ default: mockApi }));

import { analyticsApi } from './analyticsApi';

function createStore() {
  return configureStore({
    reducer: { [analyticsApi.reducerPath]: analyticsApi.reducer },
    middleware: (gdm) => gdm().concat(analyticsApi.middleware),
  });
}

describe('analyticsApi', () => {
  beforeEach(() => {
    mockApi.mockReset();
  });

  describe('getHoras', () => {
    it('queries and returns hour distribution', async () => {
      mockApi.mockResolvedValueOnce({ data: [{ hora: 10, cantidad: 5 }, { hora: 11, cantidad: 3 }] });
      const store = createStore();
      const result = await store.dispatch(analyticsApi.endpoints.getHoras.initiate({ desde: '2025-06-01', hasta: '2025-06-30' }));
      expect(result.data).toEqual([{ hora: 10, cantidad: 5 }, { hora: 11, cantidad: 3 }]);
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/analytics/charts/horas',
        method: 'GET',
        params: { desde: '2025-06-01', hasta: '2025-06-30' },
      });
    });

    it('sends optional barberId param', async () => {
      mockApi.mockResolvedValueOnce({ data: [] });
      const store = createStore();
      await store.dispatch(analyticsApi.endpoints.getHoras.initiate({ desde: '2025-06-01', hasta: '2025-06-30', barberId: 'b1' }));
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/analytics/charts/horas',
        method: 'GET',
        params: { desde: '2025-06-01', hasta: '2025-06-30', barberId: 'b1' },
      });
    });
  });

  describe('getDiasSemana', () => {
    it('queries and returns day-of-week distribution', async () => {
      mockApi.mockResolvedValueOnce({ data: [{ dia: 1, diaNombre: 'Lunes', cantidad: 10 }] });
      const store = createStore();
      const result = await store.dispatch(analyticsApi.endpoints.getDiasSemana.initiate({ desde: '2025-06-01', hasta: '2025-06-30' }));
      expect(result.data).toEqual([{ dia: 1, diaNombre: 'Lunes', cantidad: 10 }]);
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/analytics/charts/dias-semana',
        method: 'GET',
        params: { desde: '2025-06-01', hasta: '2025-06-30' },
      });
    });
  });

  describe('getClientesRecurrentes', () => {
    it('queries and returns client return rate', async () => {
      mockApi.mockResolvedValueOnce({ data: { totalClientes: 100, recurrentes: 30, tasaRetorno: 30, nuevos: 50 } });
      const store = createStore();
      const result = await store.dispatch(analyticsApi.endpoints.getClientesRecurrentes.initiate({ desde: '2025-01-01', hasta: '2025-12-31' }));
      expect(result.data).toEqual({ totalClientes: 100, recurrentes: 30, tasaRetorno: 30, nuevos: 50 });
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/analytics/charts/clientes-recurrentes',
        method: 'GET',
        params: { desde: '2025-01-01', hasta: '2025-12-31' },
      });
    });
  });

  describe('getIngresosPorServicio', () => {
    it('queries and returns revenue by service', async () => {
      mockApi.mockResolvedValueOnce({ data: [{ serviceId: 's1', serviceName: 'Corte', cantidad: 50, ingresos: 25000 }] });
      const store = createStore();
      const result = await store.dispatch(analyticsApi.endpoints.getIngresosPorServicio.initiate({ desde: '2025-06-01', hasta: '2025-06-30' }));
      expect(result.data).toEqual([{ serviceId: 's1', serviceName: 'Corte', cantidad: 50, ingresos: 25000 }]);
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/analytics/charts/ingresos-servicio',
        method: 'GET',
        params: { desde: '2025-06-01', hasta: '2025-06-30' },
      });
    });
  });

  describe('getOverview', () => {
    it('sends preset param when provided', async () => {
      mockApi.mockResolvedValueOnce({ data: { totalReservas: 10, duracionTotalMinutos: 300, ingresosTotales: 5000, ingresosPendientes: 1000, nuevosClientes: 3, estadisticasPorEstado: {} } });
      const store = createStore();
      await store.dispatch(analyticsApi.endpoints.getOverview.initiate({ preset: 'mes' }));
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/analytics/overview',
        method: 'GET',
        params: { preset: 'mes' },
      });
    });
  });

  describe('error handling', () => {
    it('returns structured error when API fails', async () => {
      mockApi.mockRejectedValueOnce({ response: { status: 500, data: { error: 'Error interno' } }, message: 'Error interno' });
      const store = createStore();
      const result = await store.dispatch(analyticsApi.endpoints.getHoras.initiate({ desde: '2025-06-01', hasta: '2025-06-30' }));
      expect(result.error).toEqual({ status: 500, data: 'Error interno' });
    });

    it('uses default message if no response', async () => {
      mockApi.mockRejectedValueOnce(new Error('Network Error'));
      const store = createStore();
      const result = await store.dispatch(analyticsApi.endpoints.getHoras.initiate({ desde: '2025-06-01', hasta: '2025-06-30' }));
      expect((result.error as { data: string }).data).toBe('Network Error');
    });
  });
});
