import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../../../test/utils';
import ProfessionalsPage from './index';

vi.mock('../../../../services/professional.service', () => ({
  professionalService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    updateSchedule: vi.fn(),
    getSchedule: vi.fn(),
    getSlots: vi.fn(),
  },
}));

vi.mock('../../../../utils/token', () => ({
  getTokenUser: vi.fn(),
}));

import { professionalService } from '../../../../services/professional.service';
import { getTokenUser } from '../../../../utils/token';

const mockEmployees = [
  {
    id: 'emp1',
    name: 'Carlos',
    lastname: 'López',
    email: 'carlos@barberia.com',
    phone: '099111111',
    kind: 'Empleado',
    specialties: ['corte'],
    age: 25,
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
  },
  {
    id: 'emp2',
    name: 'María',
    lastname: 'García',
    email: 'maria@barberia.com',
    phone: '099222222',
    kind: 'Empleado',
    specialties: ['color', 'corte'],
    age: 30,
    photoUrl: null,
    isActive: false,
    slotDuration: 45,
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
  barbers: { list: mockEmployees, isLoading: false, error: null },
};

describe('ProfessionalsPage', () => {
  beforeEach(() => {
    vi.mocked(getTokenUser).mockReturnValue({ id: 'admin1', email: 'admin@test.com', kind: 'Admin' });
    vi.mocked(professionalService.list).mockResolvedValue([
      {
        id: 'admin1',
        name: 'Admin',
        lastname: 'Test',
        email: 'admin@test.com',
        phone: '099000000',
        kind: 'Admin',
        specialties: [],
        age: null,
        photoUrl: null,
        isActive: true,
        slotDuration: 30,
        schedule: {
          monday: { startTime: null, endTime: null, breaks: [] },
          tuesday: { startTime: null, endTime: null, breaks: [] },
          wednesday: { startTime: null, endTime: null, breaks: [] },
          thursday: { startTime: null, endTime: null, breaks: [] },
          friday: { startTime: null, endTime: null, breaks: [] },
          saturday: { startTime: null, endTime: null, breaks: [] },
          sunday: { startTime: null, endTime: null, breaks: [] },
        },
      },
      ...mockEmployees,
    ]);
  });

  it('renders the page heading and description', () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    expect(screen.getByText('Gestioná barberos, horarios y slots desde una sola pantalla.')).toBeInTheDocument();
  });

  it('renders employee stats cards', () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    const empleadosElements = screen.getAllByText('Empleados');
    expect(empleadosElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Activos')).toBeInTheDocument();
  });

  it('renders the search input', () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    expect(screen.getByPlaceholderText('Nombre, email, teléfono o especialidad')).toBeInTheDocument();
  });

  it('renders the slots section with date picker', () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    expect(screen.getByText('Slots disponibles')).toBeInTheDocument();
    expect(screen.getByText('Mis slots')).toBeInTheDocument();
  });

  it('renders "Nuevo profesional" button', () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    expect(screen.getByText('Nuevo profesional')).toBeInTheDocument();
  });

  it('shows employee names from Redux data', async () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText('Carlos López')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
    });
  });

  it('shows active/inactive badges for employees', async () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    await waitFor(() => {
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Inactivo')).toBeInTheDocument();
    });
  });

  it('does not include admin in employee list', async () => {
    renderWithProviders(<ProfessionalsPage />, { preloadedState });

    await waitFor(() => {
      expect(screen.queryByText('Admin Test')).not.toBeInTheDocument();
    });
  });
});
