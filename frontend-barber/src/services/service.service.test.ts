import { describe, expect, it, vi } from 'vitest';

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('./api', () => ({ default: mockApi }));

describe('serviceService', () => {
  it('retorna la lista de servicios', async () => {
    const services = [
      { id: 's1', name: 'Corte', description: 'Corte clásico', price: 500, imageUrl: '/img/corte.jpg' },
      { id: 's2', name: 'Barba', description: 'Arreglo de barba', price: 300, imageUrl: '/img/barba.jpg' },
    ];
    mockApi.get.mockResolvedValueOnce({ data: { services } });
    const { serviceService } = await import('./service.service');
    const result = await serviceService.list();
    expect(result).toEqual(services);
    expect(mockApi.get).toHaveBeenCalledWith('/api/services');
  });

  it('lanza error cuando falla la petición', async () => {
    mockApi.get.mockRejectedValueOnce(new Error('Error de red'));
    const { serviceService } = await import('./service.service');
    await expect(serviceService.list()).rejects.toThrow('Error de red');
  });
});
