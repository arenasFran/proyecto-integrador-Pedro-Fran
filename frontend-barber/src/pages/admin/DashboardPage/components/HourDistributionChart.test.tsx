import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/utils';

const mockHook = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/analyticsApi', () => ({
  useGetHorasQuery: mockHook,
}));

import HourDistributionChart from './HourDistributionChart';

describe('HourDistributionChart', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('shows loading state', () => {
    mockHook.mockReturnValue({ data: [], isFetching: true, isLoading: true, error: undefined });
    renderWithProviders(<HourDistributionChart />);
    expect(screen.getByText('Turnos por hora del día')).toBeInTheDocument();
  });

  it('shows error message', () => {
    mockHook.mockReturnValue({ data: [], isFetching: false, isLoading: false, error: { data: 'Error de prueba' } });
    renderWithProviders(<HourDistributionChart />);
    expect(screen.getByText('Error de prueba')).toBeInTheDocument();
  });

  it('renders data and shows peak hours', () => {
    mockHook.mockReturnValue({
      data: [
        { hora: 9, cantidad: 2 },
        { hora: 10, cantidad: 5 },
        { hora: 11, cantidad: 3 },
        { hora: 14, cantidad: 4 },
      ],
      isFetching: false,
      isLoading: false,
      error: undefined,
    });
    renderWithProviders(<HourDistributionChart />);
    expect(screen.getByText('Horas pico:')).toBeInTheDocument();
    expect(screen.getByText('10:00 (5)')).toBeInTheDocument();
    expect(screen.getByText('14:00 (4)')).toBeInTheDocument();
    expect(screen.getByText('11:00 (3)')).toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    mockHook.mockReturnValue({ data: [], isFetching: false, isLoading: false, error: undefined });
    renderWithProviders(<HourDistributionChart />);
    expect(screen.getByText('Turnos por hora del día')).toBeInTheDocument();
  });
});
