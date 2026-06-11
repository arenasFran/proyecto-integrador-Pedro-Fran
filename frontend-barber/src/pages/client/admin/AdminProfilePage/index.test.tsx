import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/utils';
import { AdminProfilePage } from './index';

vi.mock('../../../../services/professional.service', () => ({
  professionalService: {
    getById: vi.fn(),
    update: vi.fn(),
    updateSchedule: vi.fn(),
  },
}));

vi.mock('../../../../utils/token', () => ({
  getTokenUser: vi.fn(),
}));

import { professionalService } from '../../../../services/professional.service';

const adminUser = {
  id: 'admin1',
  name: 'Santiago',
  lastname: 'Abbona',
  email: 'santiago@barberia.com',
  phone: '099000000',
  kind: 'Admin' as const,
  services: ['corte', 'barba'],
  age: 30,
  photoUrl: 'https://example.com/photo.jpg',
  isActive: true,
  slotDuration: 30,
  schedule: {
    monday: { startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
    tuesday: { startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
    wednesday: { startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
    thursday: { startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
    friday: { startTime: '09:00', endTime: '18:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
    saturday: { startTime: '09:00', endTime: '13:00', breaks: [] },
    sunday: { startTime: null, endTime: null, breaks: [] },
  },
};

const preloadedState = {
  auth: { user: adminUser } as never,
  barbers: { list: [], isLoading: false, error: null },
};

describe('AdminProfilePage', () => {
  beforeEach(() => {
    vi.mocked(professionalService.update).mockResolvedValue(adminUser);
    vi.mocked(professionalService.updateSchedule).mockResolvedValue(adminUser.schedule);
  });

  it('renders loading state initially when user is null', () => {
    renderWithProviders(<AdminProfilePage />, {
      preloadedState: {
        auth: { user: null } as never,
        barbers: { list: [], isLoading: false, error: null },
      },
    });

    expect(screen.getByText('Cargando perfil...')).toBeInTheDocument();
  });

  it('renders admin name and role from Redux user', async () => {
    renderWithProviders(<AdminProfilePage />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText('Santiago Abbona')).toBeInTheDocument();
    });
    expect(screen.getByText('Administrador de la barbería')).toBeInTheDocument();
  });

  it('displays "Mi perfil" badge', () => {
    renderWithProviders(<AdminProfilePage />, { preloadedState });

    expect(screen.getByText('Mi perfil')).toBeInTheDocument();
  });

  it('renders the profile form with admin data', async () => {
    renderWithProviders(<AdminProfilePage />, { preloadedState });

    await waitFor(() => {
      const emailInput = screen.getByDisplayValue('santiago@barberia.com');
      expect(emailInput).toBeInTheDocument();
    });
  });

  it('renders the schedule section', async () => {
    renderWithProviders(<AdminProfilePage />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText('Calendario')).toBeInTheDocument();
    });
    expect(screen.getByText('Mi horario')).toBeInTheDocument();
  });

  it('renders "Guardar perfil" submit button', async () => {
    renderWithProviders(<AdminProfilePage />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText('Guardar perfil')).toBeInTheDocument();
    });
  });

  it('renders "Volver" buttons', async () => {
    renderWithProviders(<AdminProfilePage />, { preloadedState });

    await waitFor(() => {
      const volverButtons = screen.getAllByText('Volver');
      expect(volverButtons.length).toBe(2);
    });
  });
});
