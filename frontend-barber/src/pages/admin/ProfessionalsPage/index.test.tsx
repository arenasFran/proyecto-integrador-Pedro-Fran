import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../test/utils';
import ProfessionalsPage from './index';

vi.mock('../../../services/professional.service', () => {
  const professionalService = {
    getPublic: vi.fn(),
    list: vi.fn(),
    listPaginated: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    deactivate: vi.fn(),
    activate: vi.fn(),
    getSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    getSlots: vi.fn(),
    getOccupancy: vi.fn().mockResolvedValue(null),
  };
  return { professionalService, default: professionalService };
});

vi.mock('../../../utils/token', () => ({
  getTokenUser: vi.fn(),
  getTokenKind: vi.fn(),
}));

vi.mock('../../../services/api', () => ({
  getAccessToken: vi.fn(() => 'mock-token'),
}));

import { professionalService } from '../../../services/professional.service';
import { getTokenUser, getTokenKind } from '../../../utils/token';
import type { Professional } from '../../../types/professional';

const mockEmployees: Professional[] = [
  {
    id: 'emp1',
    name: 'Carlos',
    lastname: 'López',
    email: 'carlos@barberia.com',
    phone: '099111111',
    kind: 'Empleado',
    services: ['corte'],
    age: 25,
    photoUrl: null,
    isActive: true,
    slotDuration: 30,
    maxAdvanceDays: 30,
    schedule: {
      monday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      tuesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      wednesday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      thursday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      friday: { startTime: '09:00', endTime: '18:00', breaks: [] },
      saturday: { startTime: '09:00', endTime: '13:00', breaks: [] },
      sunday: { startTime: null, endTime: null, breaks: [] },
    },
  },
  {
    id: 'emp2',
    name: 'María',
    lastname: 'García',
    email: 'maria@barberia.com',
    phone: '099222222',
    kind: 'Empleado',
    services: ['color', 'corte'],
    age: 30,
    photoUrl: null,
    isActive: false,
    slotDuration: 45,
    maxAdvanceDays: 30,
    schedule: {
      monday: { startTime: '10:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
      tuesday: { startTime: '10:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
      wednesday: { startTime: '10:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
      thursday: { startTime: '10:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
      friday: { startTime: '10:00', endTime: '17:00', breaks: [{ startTime: '13:00', endTime: '14:00' }] },
      saturday: { startTime: null, endTime: null, breaks: [] },
      sunday: { startTime: null, endTime: null, breaks: [] },
    },
  },
];

const preloadedState = {
  auth: { user: null } as never,
  barbers: {
    list: mockEmployees,
    isLoading: false,
    error: null,
    total: 2,
    page: 1,
    totalPages: 1,
    limit: 50,
  },
};

describe('ProfessionalsPage', () => {
  beforeEach(() => {
    vi.mocked(getTokenUser).mockReturnValue({ id: 'admin1', email: 'admin@test.com', kind: 'Admin' });
    vi.mocked(getTokenKind).mockReturnValue('Admin');
    vi.mocked(professionalService.listPaginated).mockResolvedValue({
      barbers: [
        {
          id: 'admin1',
          name: 'Admin',
          lastname: 'Test',
          email: 'admin@test.com',
          phone: '099000000',
          kind: 'Admin' as const,
          services: [],
          photoUrl: null,
          isActive: true,
          slotDuration: 30,
          maxAdvanceDays: 30,
          schedule: {
            monday: { startTime: null, endTime: null, breaks: [] },
            tuesday: { startTime: null, endTime: null, breaks: [] },
            wednesday: { startTime: null, endTime: null, breaks: [] },
            thursday: { startTime: null, endTime: null, breaks: [] },
            friday: { startTime: null, endTime: null, breaks: [] },
            saturday: { startTime: null, endTime: null, breaks: [] },
            sunday: { startTime: null, endTime: null, breaks: [] },
          },
        } as Professional,
        ...mockEmployees,
      ],
      total: 3,
      page: 1,
      totalPages: 1,
      limit: 50,
    });
  });

  it('renders the page heading', () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    expect(screen.getByRole('heading', { name: 'Barberos' })).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    expect(
      screen.getByPlaceholderText('Buscar por nombre, email o teléfono...')
    ).toBeInTheDocument();
  });

  it('renders "Nuevo barbero" button', () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    expect(screen.getByText('Nuevo barbero')).toBeInTheDocument();
  });

  it('shows employee names from Redux data', async () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText('Carlos López')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
    });
  });

  it('shows active/inactive badges', async () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Inactivo')).toBeInTheDocument();
    });
  });

  it('shows action buttons for each employee', async () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    await waitFor(() => {
      const editButtons = screen.getAllByText('Editar');
      expect(editButtons.length).toBe(2);
    });
  });

  it('does not include admin in employee list', async () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    await waitFor(() => {
      expect(screen.queryByText('Admin Test')).not.toBeInTheDocument();
    });
  });
});
