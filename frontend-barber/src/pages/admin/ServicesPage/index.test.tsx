import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils';

const mockDeleteTrigger = vi.hoisted(() => vi.fn());

vi.mock('../../../services/service.api', () => ({
  useGetServicesAdminQuery: vi.fn(),
  useCreateServiceMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useUpdateServiceMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useDeleteServiceMutation: vi.fn(),
}));

import { useGetServicesAdminQuery, useDeleteServiceMutation } from '../../../services/service.api';
import ServicesPage from './index';

const activeService = {
  id: '1',
  name: 'Corte de pelo',
  description: 'Corte clásico',
  price: 490,
  imageUrl: '',
  isActive: true,
  isDeleted: false,
};

const inactiveService = {
  id: '2',
  name: 'Barba completa',
  description: 'Arreglo de barba',
  price: 350,
  imageUrl: '',
  isActive: false,
  isDeleted: false,
};

const mockServices = [activeService, inactiveService];

function mockQuery(
  overrides: Partial<ReturnType<typeof useGetServicesAdminQuery>> = {}
) {
  return vi.mocked(useGetServicesAdminQuery).mockReturnValue({
    data: mockServices,
    isLoading: false,
    isFetching: false,
    error: undefined,
    refetch: vi.fn(),
    ...overrides,
  } as any);
}

describe('ServicesPage', () => {
  beforeEach(() => {
    vi.mocked(useGetServicesAdminQuery).mockReset();
    vi.mocked(useDeleteServiceMutation).mockReset();
    vi.mocked(useDeleteServiceMutation).mockReturnValue([
      mockDeleteTrigger,
      { isLoading: false },
    ]);
    mockDeleteTrigger.mockClear();
  });

  it('renderiza lista de servicios con stats y acciones', () => {
    mockQuery();
    renderWithProviders(<ServicesPage />);

    expect(
      screen.getByText('Administrá los servicios ofrecidos.')
    ).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Activos')).toBeInTheDocument();
    expect(screen.getByText('Inactivos')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('1')).toHaveLength(2);
    expect(screen.getAllByText('Corte de pelo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Barba completa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$490').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$350').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Activo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Inactivo').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('Editar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByTitle('Eliminar').length).toBeGreaterThanOrEqual(2);
  });

  it('muestra empty state cuando no hay servicios', () => {
    mockQuery({ data: [] });
    renderWithProviders(<ServicesPage />);

    expect(
      screen.getByText('No hay servicios registrados.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Creá el primer servicio para empezar/)
    ).toBeInTheDocument();
    expect(screen.getAllByText('Nuevo servicio').length).toBeGreaterThanOrEqual(1);
  });

  it('abre modal de confirmación, ejecuta delete y cierra modal', async () => {
    const user = userEvent.setup();
    mockQuery({ data: [activeService] });
    mockDeleteTrigger.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: { service: { ...activeService, isDeleted: true } },
        }),
    });
    renderWithProviders(<ServicesPage />);

    await user.click(screen.getAllByTitle('Eliminar')[0]);

    expect(screen.getByText('Eliminar servicio')).toBeInTheDocument();
    expect(screen.getAllByText(/Corte de pelo/).length).toBeGreaterThanOrEqual(1);

    await user.click(screen.getByText('Eliminar'));

    expect(mockDeleteTrigger).toHaveBeenCalledWith('1');

    await waitFor(() => {
      expect(
        screen.queryByText('Eliminar servicio')
      ).not.toBeInTheDocument();
    });
  });

  it('deshabilita botones de eliminar durante la mutación', () => {
    vi.mocked(useDeleteServiceMutation).mockReturnValue([
      mockDeleteTrigger,
      { isLoading: true },
    ]);
    mockQuery({ data: [activeService] });
    renderWithProviders(<ServicesPage />);

    const deleteButtons = screen.getAllByTitle('Eliminar');
    deleteButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('muestra pantalla de error cuando falla la consulta', () => {
    mockQuery({
      data: undefined,
      isLoading: false,
      error: { status: 500, data: 'Error' },
    });
    renderWithProviders(<ServicesPage />);

    expect(screen.getByText('Error al cargar servicios')).toBeInTheDocument();
    expect(
      screen.getByText(/Verificá la conexión/)
    ).toBeInTheDocument();
    expect(screen.queryByText('Corte de pelo')).not.toBeInTheDocument();
  });
});
