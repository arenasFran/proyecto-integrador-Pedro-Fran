import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from 'react-router-dom';
import { renderWithProviders } from '../../test/utils';
import { AdminHeader } from './AdminHeader';
import type { Professional } from '../../types/professional';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../../utils/token', () => ({
  getTokenUser: vi.fn(),
}));

import { getTokenUser } from '../../utils/token';

const adminUser: Professional = {
  id: 'admin1',
  name: 'Santiago',
  lastname: 'Abbona',
  email: 'santiago@barberia.com',
  phone: '099000000',
  kind: 'Admin',
  services: ['corte', 'barba'],
  age: 30,
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

describe('AdminHeader', () => {
  beforeEach(() => {
    vi.mocked(getTokenUser).mockReturnValue(null);
  });

  it('renders the brand name', () => {
    renderWithProviders(<AdminHeader />);
    expect(screen.getByText('Barbería SA')).toBeInTheDocument();
  });

  it('shows "Admin" when no user and no token', () => {
    renderWithProviders(<AdminHeader />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('shows email from token when no Redux user', () => {
    vi.mocked(getTokenUser).mockReturnValue({
      id: 'admin1',
      email: 'admin@test.com',
      kind: 'Admin',
    });

    renderWithProviders(<AdminHeader />);
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
  });

  it('shows full name when Redux user is set', () => {
    renderWithProviders(<AdminHeader />, {
      preloadedState: {
        auth: { user: adminUser } as never,
      },
    });

    expect(screen.getByText('Santiago Abbona')).toBeInTheDocument();
  });

  it('shows user full name over email when both exist', () => {
    vi.mocked(getTokenUser).mockReturnValue({
      id: 'admin1',
      email: 'admin@test.com',
      kind: 'Admin',
    });

    renderWithProviders(<AdminHeader />, {
      preloadedState: {
        auth: { user: adminUser } as never,
      },
    });

    expect(screen.getByText('Santiago Abbona')).toBeInTheDocument();
    expect(screen.queryByText('admin@test.com')).not.toBeInTheDocument();
  });

  it('opens dropdown on user button click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminHeader />);

    const userButton = screen.getByRole('button', { name: /admin/i });
    await user.click(userButton);

    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
    expect(screen.getByText('Cerrar sesión')).toBeInTheDocument();
  });

  it('navigates to /admin/perfil when "Mi perfil" is clicked', async () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    const user = userEvent.setup();
    renderWithProviders(<AdminHeader />, {
      preloadedState: {
        auth: { user: adminUser } as never,
      },
    });

    await user.click(screen.getByRole('button', { name: /santiago abbona/i }));
    await user.click(screen.getByText('Mi perfil'));

    expect(navigate).toHaveBeenCalledWith('/admin/perfil');
  });

  it('dispatches logout and navigates to /login on "Cerrar sesión"', async () => {
    const navigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(navigate);

    const user = userEvent.setup();
    const { store } = renderWithProviders(<AdminHeader />, {
      preloadedState: {
        auth: { user: adminUser } as never,
      },
    });

    const dispatchSpy = vi.spyOn(store, 'dispatch');

    await user.click(screen.getByRole('button', { name: /santiago abbona/i }));
    await user.click(screen.getByText('Cerrar sesión'));

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth/logout' })
    );
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
