import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/utils';

const mockHook = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/analyticsApi', () => ({
  useGetDistribucionQuery: mockHook,
}));

import BarberComparisonTable from './BarberComparisonTable';

describe('BarberComparisonTable', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('shows loading state', () => {
    mockHook.mockReturnValue({ data: undefined, isLoading: true, error: undefined });
    renderWithProviders(<BarberComparisonTable />);
    expect(screen.getByText('Comparativa de barberos')).toBeInTheDocument();
  });

  it('shows error message', () => {
    mockHook.mockReturnValue({ data: undefined, isLoading: false, error: { data: 'API error' } });
    renderWithProviders(<BarberComparisonTable />);
    expect(screen.getByText('API error')).toBeInTheDocument();
  });

  it('renders barber rows with averages', () => {
    mockHook.mockReturnValue({
      data: {
        byBarber: [
          { barberId: 'b1', nombre: 'Carlos Lopez', cantidad: 10, ingresos: 5000 },
          { barberId: 'b2', nombre: 'Pedro Garcia', cantidad: 5, ingresos: 2000 },
        ],
      },
      isLoading: false,
      error: undefined,
    });
    renderWithProviders(<BarberComparisonTable />);
    expect(screen.getByText('Carlos Lopez')).toBeInTheDocument();
    expect(screen.getByText('Pedro Garcia')).toBeInTheDocument();
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.getByText('$400')).toBeInTheDocument();
  });

  it('shows empty message when no barbers', () => {
    mockHook.mockReturnValue({ data: { byBarber: [] }, isLoading: false, error: undefined });
    renderWithProviders(<BarberComparisonTable />);
    expect(screen.getByText('No hay datos para el período seleccionado.')).toBeInTheDocument();
  });
});
