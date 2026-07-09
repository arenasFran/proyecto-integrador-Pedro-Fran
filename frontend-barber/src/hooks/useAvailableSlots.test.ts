import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAvailableSlots } from './useAvailableSlots';
import { professionalService } from '../services/professional.service';

vi.mock('../services/professional.service', () => ({
  professionalService: {
    getSlots: vi.fn(),
  },
}));

describe('useAvailableSlots', () => {
  beforeEach(() => {
    vi.mocked(professionalService.getSlots).mockReset();
  });

  it('debe exponer los slots devueltos por el servicio', async () => {
    vi.mocked(professionalService.getSlots).mockResolvedValue({ slots: ['10:00', '10:30'] });

    const { result } = renderHook(() => useAvailableSlots('barber-1', '2099-01-01', true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slots).toEqual(['10:00', '10:30']);
    expect(result.current.error).toBe(false);
  });

  it('debe exponer error=true y slots vacío si el fetch falla (429, timeout, 500)', async () => {
    vi.mocked(professionalService.getSlots).mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useAvailableSlots('barber-1', '2099-01-01', true));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.slots).toEqual([]);
    expect(result.current.error).toBe(true);
  });

  it('debe resetear error al reintentar con éxito tras un fetch fallido', async () => {
    vi.mocked(professionalService.getSlots).mockRejectedValueOnce(new Error('Network Error'));

    const { result, rerender } = renderHook(
      ({ date }) => useAvailableSlots('barber-1', date, true),
      { initialProps: { date: '2099-01-01' } }
    );

    await waitFor(() => expect(result.current.error).toBe(true));

    vi.mocked(professionalService.getSlots).mockResolvedValue({ slots: ['11:00'] });
    rerender({ date: '2099-01-02' });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(false);
    expect(result.current.slots).toEqual(['11:00']);
  });
});
