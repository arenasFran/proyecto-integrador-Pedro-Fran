import { describe, expect, it, vi } from 'vitest';

const mockApi = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./api', () => ({ default: mockApi }));

describe('tempLockService', () => {
  it('adquiere un temp lock y retorna el id', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { message: 'ok', tempLockId: 'lock-123' } });
    const { tempLockService } = await import('./appointment.service');
    const id = await tempLockService.acquire('b1', '2025-06-16', '10:00');
    expect(id).toBe('lock-123');
    expect(mockApi.post).toHaveBeenCalledWith('/api/appointments/temp-lock', {
      barberId: 'b1', date: '2025-06-16', startTime: '10:00',
    });
  });

  it('libera un temp lock', async () => {
    mockApi.delete.mockResolvedValueOnce({ data: {} });
    const { tempLockService } = await import('./appointment.service');
    await tempLockService.release('lock-123');
    expect(mockApi.delete).toHaveBeenCalledWith('/api/appointments/temp-lock/lock-123');
  });
});

describe('appointmentService', () => {
  const payload = {
    barberId: 'b1', serviceId: 's1', date: '2025-06-16',
    startTime: '10:00', clientName: 'Juan', clientLastname: 'Pérez',
    clientPhone: '123456789', clientEmail: 'juan@test.com',
  };

  it('crea una cita exitosamente', async () => {
    const response = { message: 'Creada', appointment: { id: 'apt-1', ...payload } };
    mockApi.post.mockResolvedValueOnce({ data: response });
    const { appointmentService } = await import('./appointment.service');
    const result = await appointmentService.create(payload);
    expect(result).toEqual(response);
    expect(mockApi.post).toHaveBeenCalledWith('/api/appointments', payload);
  });

  it('lista citas con filtros', async () => {
    const response = { appointments: [{ id: 'apt-1' }] };
    mockApi.get.mockResolvedValueOnce({ data: response });
    const { appointmentService } = await import('./appointment.service');
    const result = await appointmentService.list({ barberId: 'b1', date: '2025-06-16' });
    expect(result).toEqual(response);
    expect(mockApi.get).toHaveBeenCalledWith('/api/appointments', {
      params: { barberId: 'b1', date: '2025-06-16' },
    });
  });

  it('obtiene una cita por id', async () => {
    const response = { appointment: { id: 'apt-1' } };
    mockApi.get.mockResolvedValueOnce({ data: response });
    const { appointmentService } = await import('./appointment.service');
    const result = await appointmentService.getById('apt-1');
    expect(result).toEqual(response);
    expect(mockApi.get).toHaveBeenCalledWith('/api/appointments/apt-1');
  });

  it('cancela una cita con motivo', async () => {
    const response = { message: 'Cancelada' };
    mockApi.patch.mockResolvedValueOnce({ data: response });
    const { appointmentService } = await import('./appointment.service');
    const result = await appointmentService.cancel('apt-1', 'Cliente no asistió');
    expect(result).toEqual(response);
    expect(mockApi.patch).toHaveBeenCalledWith('/api/appointments/apt-1/cancel', {
      reason: 'Cliente no asistió',
    });
  });

  it('cancela una cita sin motivo', async () => {
    mockApi.patch.mockResolvedValueOnce({ data: { message: 'Cancelada' } });
    const { appointmentService } = await import('./appointment.service');
    await appointmentService.cancel('apt-1');
    expect(mockApi.patch).toHaveBeenCalledWith('/api/appointments/apt-1/cancel', { reason: undefined });
  });

  it('actualiza el estado de una cita', async () => {
    const response = { message: 'Actualizado' };
    mockApi.patch.mockResolvedValueOnce({ data: response });
    const { appointmentService } = await import('./appointment.service');
    const result = await appointmentService.updateStatus('apt-1', { status: 'Completado' });
    expect(result).toEqual(response);
    expect(mockApi.patch).toHaveBeenCalledWith('/api/appointments/apt-1/status', { status: 'Completado' });
  });

  it('reprograma una cita', async () => {
    const response = { message: 'Reprogramada', appointment: { id: 'apt-1' } };
    mockApi.patch.mockResolvedValueOnce({ data: response });
    const { appointmentService } = await import('./appointment.service');
    const result = await appointmentService.reschedule('apt-1', {
      date: '2025-06-17', startTime: '11:00', barberId: 'b1',
    });
    expect(result).toEqual(response);
    expect(mockApi.patch).toHaveBeenCalledWith('/api/appointments/apt-1/reschedule', {
      date: '2025-06-17', startTime: '11:00', barberId: 'b1',
    });
  });

  it('lanza error cuando la petición falla', async () => {
    mockApi.post.mockRejectedValueOnce(new Error('Error de red'));
    const { appointmentService } = await import('./appointment.service');
    await expect(appointmentService.create(payload)).rejects.toThrow('Error de red');
  });
});
