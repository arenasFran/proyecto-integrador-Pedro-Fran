import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils';
import { CombinedActionModal } from './CombinedActionModal';
import type { Appointment } from '../../../types/booking';

const appointment: Appointment = {
  id: 'apt-1',
  barberId: 'barber-1',
  clientName: 'Juan',
  clientLastname: 'Perez',
  serviceId: 'svc-1',
  serviceName: 'Corte de pelo',
  servicePrice: 490,
  serviceDuration: 50,
  date: '2099-01-01',
  startTime: '10:00',
  endTime: '10:50',
  status: 'Confirmado',
  paymentStatus: 'Pagado',
  paymentMethod: 'memberPass',
  createdAt: '2099-01-01T00:00:00.000Z',
  updatedAt: '2099-01-01T00:00:00.000Z',
};

describe('CombinedActionModal', () => {
  it('solo permite completar un turno cubierto por membresía', async () => {
    const user = userEvent.setup();
    const onCompleteOnly = vi.fn();

    renderWithProviders(
      <CombinedActionModal
        target={{ appointment, primaryAction: 'Completado' }}
        isUpdatingStatus={false}
        isMarkingPaid={false}
        onCompleteOnly={onCompleteOnly}
        onCompleteAndPaid={vi.fn()}
        onMarkPaidOnly={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Solo completar')).toBeDefined();
    expect(screen.queryByText('Completar y marcar pagado')).toBeNull();

    await user.click(screen.getByText('Solo completar'));
    expect(onCompleteOnly).toHaveBeenCalledWith('apt-1');
  });
});
