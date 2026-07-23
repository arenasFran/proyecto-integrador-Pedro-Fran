import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/utils';

const mockHook = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/analyticsApi', () => ({
  useGetIngresosPorServicioQuery: mockHook,
}));

import RevenueByServiceChart from './RevenueByServiceChart';

describe('RevenueByServiceChart', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('shows loading state', () => {
    mockHook.mockReturnValue({ data: [], isFetching: true, isLoading: true, error: undefined });
    renderWithProviders(<RevenueByServiceChart />);
    expect(screen.getByText('Ingresos por servicio')).toBeInTheDocument();
  });

  it('shows error message', () => {
    mockHook.mockReturnValue({ data: [], isFetching: false, isLoading: false, error: { data: 'Error' } });
    renderWithProviders(<RevenueByServiceChart />);
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders service rows with counts and revenue', () => {
    mockHook.mockReturnValue({
      data: [
        { serviceId: 's1', serviceName: 'Corte', cantidad: 30, ingresos: 15000 },
        { serviceId: 's2', serviceName: 'Barba', cantidad: 15, ingresos: 6000 },
      ],
      isFetching: false,
      isLoading: false,
      error: undefined,
    });
    renderWithProviders(<RevenueByServiceChart />);
    expect(screen.getByText('Corte')).toBeInTheDocument();
    expect(screen.getByText('Barba')).toBeInTheDocument();
    expect(screen.getByText('30 turnos')).toBeInTheDocument();
    expect(screen.getByText('15 turnos')).toBeInTheDocument();
    expect(screen.getByText('$15.000')).toBeInTheDocument();
    expect(screen.getByText('$6.000')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    mockHook.mockReturnValue({ data: [], isFetching: false, isLoading: false, error: undefined });
    renderWithProviders(<RevenueByServiceChart />);
    expect(screen.getByText('Ingresos por servicio')).toBeInTheDocument();
  });
});
