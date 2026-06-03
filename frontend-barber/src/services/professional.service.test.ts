import { describe, expect, it, vi } from 'vitest';
import { professionalService } from './professional.service';
import api from './api';

vi.mock('./api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const mockBarber = {
  _id: 'b1',
  name: 'Juan',
  lastname: 'Pérez',
  email: 'juan@barberia.com',
  phone: '099123456',
  kind: 'Empleado' as const,
  specialties: ['corte'],
  age: 28,
  photoUrl: null,
  isActive: true,
  slotDuration: 30,
  schedule: {
    monday: { startTime: '09:00', endTime: '18:00', breaks: [] },
    tuesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
    wednesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
    thursday: { startTime: '09:00', endTime: '18:00', breaks: [] },
    friday: { startTime: '09:00', endTime: '18:00', breaks: [] },
    saturday: { startTime: '09:00', endTime: '13:00', breaks: [] },
    sunday: { startTime: null, endTime: null, breaks: [] },
  },
};

describe('professionalService', () => {
  it('list calls GET /api/barbers and returns barbers array', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: { barbers: [mockBarber] } });

    const result = await professionalService.list();

    expect(mockedApi.get).toHaveBeenCalledWith('/api/barbers');
    expect(result).toEqual([mockBarber]);
  });

  it('getById calls GET /api/barbers/:id and returns professional', async () => {
    mockedApi.get.mockResolvedValueOnce({ data: mockBarber });

    const result = await professionalService.getById('b1');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/barbers/b1');
    expect(result).toEqual(mockBarber);
  });

  it('create calls POST /api/barbers with payload and returns professional', async () => {
    const payload = {
      email: 'nuevo@barberia.com',
      password: '123456',
      name: 'Nuevo',
      lastname: 'Barber',
      phone: '099999999',
      specialties: ['barba'],
      schedule: mockBarber.schedule,
    };
    mockedApi.post.mockResolvedValueOnce({ data: { ...mockBarber, ...payload } });

    const result = await professionalService.create(payload);

    expect(mockedApi.post).toHaveBeenCalledWith('/api/barbers', payload);
    expect(result).toMatchObject({ name: 'Nuevo', lastname: 'Barber' });
  });

  it('update calls PUT /api/barbers/:id with payload and returns professional', async () => {
    const payload = { name: 'Actualizado' };
    mockedApi.put.mockResolvedValueOnce({ data: { ...mockBarber, name: 'Actualizado' } });

    const result = await professionalService.update('b1', payload);

    expect(mockedApi.put).toHaveBeenCalledWith('/api/barbers/b1', payload);
    expect(result.name).toBe('Actualizado');
  });

  it('remove calls DELETE /api/barbers/:id and returns message', async () => {
    mockedApi.delete.mockResolvedValueOnce({ data: { message: 'Profesional desactivado' } });

    const result = await professionalService.remove('b1');

    expect(mockedApi.delete).toHaveBeenCalledWith('/api/barbers/b1');
    expect(result).toBe('Profesional desactivado');
  });

  it('getSchedule calls GET /api/barbers/:id/schedule and returns schedule', async () => {
    const schedule = {
      monday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      tuesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      wednesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      thursday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      friday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      saturday: { startTime: '09:00', endTime: '13:00', breaks: [] },
      sunday: { startTime: null, endTime: null, breaks: [] },
    };
    mockedApi.get.mockResolvedValueOnce({ data: { schedule } });

    const result = await professionalService.getSchedule('b1');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/barbers/b1/schedule');
    expect(result).toEqual(schedule);
  });

  it('updateSchedule calls PUT /api/barbers/:id/schedule and returns schedule', async () => {
    const schedule = {
      monday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      tuesday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      wednesday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      thursday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      friday: { startTime: '10:00', endTime: '16:00', breaks: [] },
      saturday: { startTime: null, endTime: null, breaks: [] },
      sunday: { startTime: null, endTime: null, breaks: [] },
    };
    mockedApi.put.mockResolvedValueOnce({ data: { schedule } });

    const result = await professionalService.updateSchedule('b1', schedule);

    expect(mockedApi.put).toHaveBeenCalledWith('/api/barbers/b1/schedule', schedule);
    expect(result).toEqual(schedule);
  });

  it('getSlots calls GET /api/barbers/:id/slots with date param and returns slots response', async () => {
    const slotsResponse = { date: '2026-06-02', slots: ['09:00', '09:30', '10:00'] };
    mockedApi.get.mockResolvedValueOnce({ data: slotsResponse });

    const result = await professionalService.getSlots('b1', '2026-06-02');

    expect(mockedApi.get).toHaveBeenCalledWith('/api/barbers/b1/slots', {
      params: { date: '2026-06-02' },
    });
    expect(result).toEqual(slotsResponse);
  });
});
