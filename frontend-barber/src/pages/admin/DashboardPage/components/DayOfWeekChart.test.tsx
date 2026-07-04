import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/utils';

const mockHook = vi.hoisted(() => vi.fn());

vi.mock('../../../../services/analyticsApi', () => ({
  useGetDiasSemanaQuery: mockHook,
}));

import DayOfWeekChart from './DayOfWeekChart';

describe('DayOfWeekChart', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  it('shows loading state', () => {
    mockHook.mockReturnValue({ data: [], isFetching: true, isLoading: true, error: undefined });
    renderWithProviders(<DayOfWeekChart />);
    expect(screen.getByText('Turnos por día de la semana')).toBeInTheDocument();
  });

  it('shows error message', () => {
    mockHook.mockReturnValue({ data: [], isFetching: false, isLoading: false, error: { data: 'Error test' } });
    renderWithProviders(<DayOfWeekChart />);
    expect(screen.getByText('Error test')).toBeInTheDocument();
  });

  it('renders without crashing with data', () => {
    mockHook.mockReturnValue({
      data: [
        { dia: 1, diaNombre: 'Lunes', cantidad: 10 },
        { dia: 2, diaNombre: 'Martes', cantidad: 8 },
      ],
      isFetching: false,
      isLoading: false,
      error: undefined,
    });
    renderWithProviders(<DayOfWeekChart />);
    expect(screen.getByText('Turnos por día de la semana')).toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('shows empty state when no data', () => {
    mockHook.mockReturnValue({ data: [], isFetching: false, isLoading: false, error: undefined });
    renderWithProviders(<DayOfWeekChart />);
    expect(screen.getByText('Turnos por día de la semana')).toBeInTheDocument();
  });
});
