import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';

const mockMutationState = { isLoading: false, reset: vi.fn() };

vi.mock('../../../services/service.api', () => ({
  useGetServicesAdminQuery: vi.fn(),
  useCreateServiceMutation: vi.fn(() => [vi.fn(), { ...mockMutationState }]),
  useUpdateServiceMutation: vi.fn(() => [vi.fn(), { ...mockMutationState }]),
}));

import { useGetServicesAdminQuery } from '../../../services/service.api';
import ServicesPage from './index';

const activeService = {
  id: '1',
  name: 'Corte de pelo',
  description: 'Corte clásico',
  price: 490,
  imageUrl: '',
  status: 'active',
};

const inactiveService = {
  id: '2',
  name: 'Barba completa',
  description: 'Arreglo de barba',
  price: 350,
  imageUrl: '',
  status: 'inactive',
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
  } as ReturnType<typeof useGetServicesAdminQuery>);
}

describe('ServicesPage', () => {
  beforeEach(() => {
    vi.mocked(useGetServicesAdminQuery).mockReset();
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
    expect(screen.getAllByTitle('Activar').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByTitle('Desactivar').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTitle('Eliminar')).not.toBeInTheDocument();
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