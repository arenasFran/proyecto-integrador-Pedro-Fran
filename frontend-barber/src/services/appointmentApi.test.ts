import { describe, expect, it, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

const mockApi = vi.hoisted(() => vi.fn());

vi.mock('./api', () => ({ default: mockApi }));

import { appointmentApi } from './appointmentApi';

function createStore() {
  return configureStore({
    reducer: { [appointmentApi.reducerPath]: appointmentApi.reducer },
    middleware: (gdm) => gdm().concat(appointmentApi.middleware),
  });
}

describe('appointmentApi', () => {
  beforeEach(() => {
    mockApi.mockReset();
  });

  describe('peticiones exitosas', () => {
    it('getAppointments consulta y transforma la respuesta', async () => {
      mockApi.mockResolvedValueOnce({ data: { appointments: [{ id: '1', date: '2025-06-16' }] } });
      const store = createStore();
      const result = await store.dispatch(appointmentApi.endpoints.getAppointments.initiate());
      expect(result.data).toEqual([{ id: '1', date: '2025-06-16' }]);
      expect(mockApi).toHaveBeenCalledWith({ url: '/api/appointments', method: 'GET' });
    });

    it('getAppointments envía params correctamente', async () => {
      mockApi.mockResolvedValueOnce({ data: { appointments: [] } });
      const store = createStore();
      await store.dispatch(appointmentApi.endpoints.getAppointments.initiate({ barberId: 'b1', date: '2025-06-16' }));
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/appointments', method: 'GET',
        params: { barberId: 'b1', date: '2025-06-16' },
      });
    });

    it('getAppointmentById consulta y transforma', async () => {
      mockApi.mockResolvedValueOnce({ data: { appointment: { id: 'apt-1' } } });
      const store = createStore();
      const result = await store.dispatch(appointmentApi.endpoints.getAppointmentById.initiate('apt-1'));
      expect(result.data).toEqual({ id: 'apt-1' });
      expect(mockApi).toHaveBeenCalledWith({ url: '/api/appointments/apt-1', method: 'GET' });
    });

    it('cancelAppointment envía PATCH con id y reason', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Cancelada' } });
      const store = createStore();
      await store.dispatch(appointmentApi.endpoints.cancelAppointment.initiate({ id: 'apt-1', reason: 'Motivo' }));
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/appointments/apt-1/cancel', method: 'PATCH', data: { reason: 'Motivo' },
      });
    });

    it('cancelAppointment sin reason envía undefined', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Cancelada' } });
      const store = createStore();
      await store.dispatch(appointmentApi.endpoints.cancelAppointment.initiate({ id: 'apt-1' }));
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/appointments/apt-1/cancel', method: 'PATCH', data: { reason: undefined },
      });
    });

    it('updateAppointmentStatus envía PATCH con status y cancelReason', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Actualizado' } });
      const store = createStore();
      await store.dispatch(
        appointmentApi.endpoints.updateAppointmentStatus.initiate({ id: 'apt-1', status: 'Cancelado', cancelReason: 'No-show' })
      );
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/appointments/apt-1/status', method: 'PATCH',
        data: { status: 'Cancelado', cancelReason: 'No-show' },
      });
    });

    it('rescheduleAppointment envía PATCH con datos', async () => {
      mockApi.mockResolvedValueOnce({ data: { message: 'Reprogramada', appointment: { id: 'apt-1' } } });
      const store = createStore();
      await store.dispatch(
        appointmentApi.endpoints.rescheduleAppointment.initiate({ id: 'apt-1', date: '2025-06-17', startTime: '11:00', barberId: 'b1' })
      );
      expect(mockApi).toHaveBeenCalledWith({
        url: '/api/appointments/apt-1/reschedule', method: 'PATCH',
        data: { date: '2025-06-17', startTime: '11:00', barberId: 'b1' },
      });
    });
  });

  describe('manejo de errores', () => {
    it('retorna error estructurado cuando la API falla', async () => {
      mockApi.mockRejectedValueOnce({
        response: { status: 500, data: { error: 'Error interno' } },
        message: 'Error interno',
      });
      const store = createStore();
      const result = await store.dispatch(appointmentApi.endpoints.getAppointments.initiate());
      expect(result.error).toEqual({ status: 500, data: 'Error interno' });
    });

    it('usa mensaje por defecto si no hay response', async () => {
      mockApi.mockRejectedValueOnce(new Error('Network Error'));
      const store = createStore();
      const result = await store.dispatch(appointmentApi.endpoints.getAppointments.initiate());
      expect((result.error as { data: string }).data).toBe('Network Error');
    });
  });
});
