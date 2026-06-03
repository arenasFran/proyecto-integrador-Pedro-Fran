import { describe, expect, it, vi } from 'vitest';
import reducer, {
  fetchBarbers,
  createBarber,
  updateBarber,
  removeBarber,
  updateBarberSchedule,
} from './barbersSlice';
import { professionalService } from '../../services/professional.service';
import type { Professional } from '../../types/professional';

vi.mock('../../services/professional.service', () => ({
  professionalService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    updateSchedule: vi.fn(),
  },
}));

const mockBarber: Professional = {
  _id: 'b1',
  name: 'Juan',
  lastname: 'Pérez',
  email: 'juan@barberia.com',
  phone: '099123456',
  kind: 'Empleado',
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

const initialState = {
  list: [],
  isLoading: false,
  error: null,
};

describe('barbersSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('handles fetchBarbers.pending', () => {
    const state = reducer(initialState, fetchBarbers.pending('', undefined));
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('handles fetchBarbers.fulfilled', () => {
    const state = reducer(
      { ...initialState, isLoading: true },
      fetchBarbers.fulfilled([mockBarber], '', undefined)
    );
    expect(state.isLoading).toBe(false);
    expect(state.list).toEqual([mockBarber]);
  });

  it('handles fetchBarbers.rejected', () => {
    const state = reducer(
      { ...initialState, isLoading: true },
      fetchBarbers.rejected(new Error('fail'), '', undefined, 'Error de red')
    );
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe('Error de red');
  });

  it('creates barber via createBarber thunk', async () => {
    const payload = {
      email: 'juan@barberia.com',
      password: '123456',
      name: 'Juan',
      lastname: 'Pérez',
      phone: '099123456',
      specialties: ['corte'],
      schedule: mockBarber.schedule,
    };
    vi.mocked(professionalService.create).mockResolvedValueOnce(mockBarber);

    const dispatch = vi.fn();
    const getState = vi.fn();
    const thunk = createBarber(payload);
    await thunk(dispatch, getState, undefined);

    expect(professionalService.create).toHaveBeenCalledWith(payload);
  });

  it('updates barber via updateBarber thunk', async () => {
    vi.mocked(professionalService.update).mockResolvedValueOnce(mockBarber);

    const dispatch = vi.fn();
    const getState = vi.fn();
    const thunk = updateBarber({ id: 'b1', data: { name: 'Actualizado' } });
    await thunk(dispatch, getState, undefined);

    expect(professionalService.update).toHaveBeenCalledWith('b1', { name: 'Actualizado' });
  });

  it('removes barber via removeBarber thunk', async () => {
    vi.mocked(professionalService.remove).mockResolvedValueOnce('Eliminado');

    const dispatch = vi.fn();
    const getState = vi.fn();
    const thunk = removeBarber('b1');
    const result = await thunk(dispatch, getState, undefined);

    expect(professionalService.remove).toHaveBeenCalledWith('b1');
    expect(result.payload).toEqual({ id: 'b1', message: 'Eliminado' });
  });

  it('updates barber schedule via updateBarberSchedule thunk', async () => {
    const schedule = mockBarber.schedule;
    vi.mocked(professionalService.updateSchedule).mockResolvedValueOnce(schedule);

    const dispatch = vi.fn();
    const getState = vi.fn();
    const thunk = updateBarberSchedule({ id: 'b1', schedule });
    await thunk(dispatch, getState, undefined);

    expect(professionalService.updateSchedule).toHaveBeenCalledWith('b1', schedule);
  });

  it('rejects createBarber on error', async () => {
    vi.mocked(professionalService.create).mockRejectedValueOnce(new Error('Error al crear profesional'));

    const dispatch = vi.fn();
    const getState = vi.fn();
    const thunk = createBarber({
      email: 'x@y.com',
      password: '123456',
      name: 'X',
      lastname: 'Y',
      phone: '099000000',
      specialties: [],
      schedule: mockBarber.schedule,
    });

    const result = await thunk(dispatch, getState, undefined);
    expect(result.meta.requestStatus).toBe('rejected');
    expect(result.payload).toBe('Error al crear profesional');
  });

  it('rejects updateBarber on error', async () => {
    vi.mocked(professionalService.update).mockRejectedValueOnce(new Error('Error al actualizar profesional'));

    const dispatch = vi.fn();
    const getState = vi.fn();
    const thunk = updateBarber({ id: 'b1', data: { name: 'X' } });
    const result = await thunk(dispatch, getState, undefined);

    expect(result.meta.requestStatus).toBe('rejected');
    expect(result.payload).toBe('Error al actualizar profesional');
  });
});
