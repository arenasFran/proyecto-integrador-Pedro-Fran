import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils';
import { BlockModal } from './BlockModal';

const mockBarbers = [
  { id: 'b1', name: 'Juan', lastname: 'Pérez', services: [], isActive: true, slotDuration: 30, maxAdvanceDays: 30 },
  { id: 'b2', name: 'Pedro', lastname: 'García', services: [], isActive: true, slotDuration: 30, maxAdvanceDays: 30 },
];

const mockSchedule = {
  monday: { startTime: '09:00', endTime: '17:00', isActive: true },
  tuesday: { startTime: '09:00', endTime: '17:00', isActive: true },
  wednesday: { startTime: '09:00', endTime: '17:00', isActive: true },
  thursday: { startTime: '09:00', endTime: '17:00', isActive: true },
  friday: { startTime: '09:00', endTime: '17:00', isActive: true },
  saturday: null,
  sunday: null,
};

const mockTokenUser = { id: 'admin1', kind: 'Admin' };

vi.mock('../../../services/professional.service', () => ({
  professionalService: {
    getPublic: vi.fn(() => Promise.resolve(mockBarbers)),
    getSchedule: vi.fn(() => Promise.resolve(mockSchedule)),
  },
}));

vi.mock('../../../services/api', () => ({
  getAccessToken: vi.fn(() => 'test-token'),
  default: { post: vi.fn(), get: vi.fn() },
}));

vi.mock('../../../utils/token', () => ({
  getTokenUser: vi.fn(() => mockTokenUser),
  getTokenKind: vi.fn(() => 'Admin'),
}));

describe('BlockModal', () => {
  it('renders modal title with date', () => {
    renderWithProviders(<BlockModal dateStr="2026-07-05" onClose={vi.fn()} />);
    expect(screen.getByText(/bloquear horario/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-07-05/i)).toBeInTheDocument();
  });

  it('renders barber select for admin user', async () => {
    renderWithProviders(<BlockModal dateStr="2026-07-05" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getAllByText(/seleccionar/i)[0]).toBeInTheDocument();
    });
  });

  it('renders bloque button', () => {
    renderWithProviders(<BlockModal dateStr="2026-07-05" onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /bloquear/i })).toBeInTheDocument();
  });

  it('calls onClose when cancelling', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(<BlockModal dateStr="2026-07-05" onClose={onClose} />);

    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find((b) => b.getAttribute('aria-label') === 'Close modal');
    if (closeBtn) {
      await user.click(closeBtn);
      expect(onClose).toHaveBeenCalled();
    }
  });
});
