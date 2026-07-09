import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import { ClientHistoryModal } from './ClientHistoryModal';
import type { ClienteData } from '../../types/analytics';

vi.mock('../../services/analyticsApi', () => ({
  useGetClientAppointmentsQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

const baseClient: ClienteData = {
  key: 'c1',
  clientId: 'client-1',
  clientName: 'Ana',
  clientLastname: 'Gómez',
  clientPhone: '099111222',
  clientEmail: 'ana@test.com',
  kind: 'Registrado',
  registeredAt: '2026-01-01T00:00:00.000Z',
  totalVisits: 3,
  totalSpent: 1500,
  firstVisit: '2026-01-05',
  lastVisit: '2026-06-01',
  membershipStatus: null,
};

describe('ClientHistoryModal', () => {
  it('shows the "Crear turno" button and calls the callback with the client', async () => {
    const user = userEvent.setup();
    const onCreateAppointment = vi.fn();

    renderWithProviders(
      <ClientHistoryModal
        isOpen
        onClose={vi.fn()}
        client={baseClient}
        onCreateAppointment={onCreateAppointment}
      />
    );

    await user.click(screen.getByRole('button', { name: /crear turno/i }));
    expect(onCreateAppointment).toHaveBeenCalledWith(baseClient);
  });

  it('hides the button when the client has no clientId', () => {
    renderWithProviders(
      <ClientHistoryModal
        isOpen
        onClose={vi.fn()}
        client={{ ...baseClient, clientId: null }}
        onCreateAppointment={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /crear turno/i })).not.toBeInTheDocument();
  });

  it('hides the button when onCreateAppointment is not provided', () => {
    renderWithProviders(<ClientHistoryModal isOpen onClose={vi.fn()} client={baseClient} />);

    expect(screen.queryByRole('button', { name: /crear turno/i })).not.toBeInTheDocument();
  });
});
