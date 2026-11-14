import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/utils';
import { QuickCreateModal } from './QuickCreateModal';

const fullDay = { startTime: '09:00', endTime: '19:00', breaks: [] };
const mockSchedule = {
  monday: fullDay,
  tuesday: fullDay,
  wednesday: fullDay,
  thursday: fullDay,
  friday: fullDay,
  saturday: fullDay,
  sunday: fullDay,
};

const mockBarbers = [
  {
    id: 'b1',
    name: 'Juan',
    lastname: 'Pérez',
    services: [],
    isActive: true,
    slotDuration: 30,
    maxAdvanceDays: 30,
    schedule: mockSchedule,
  },
];

const mockServices = [{ id: 's1', name: 'Corte', price: 500 }];
const mockSlots = ['10:00', '10:30', '11:00'];

const withUnwrap = <T,>(value: T) => {
  const promise = Promise.resolve(value);
  return Object.assign(promise, { unwrap: () => Promise.resolve(value) });
};

const mockCreateAppointment = vi.fn(() => withUnwrap({}));
const mockAcquireTempLock = vi.fn(() =>
  withUnwrap({ tempLockId: 'lock-1', ownerToken: 'owner-1' })
);
const mockReleaseTempLock = vi.fn(() => Promise.resolve());
const mockRegisteredClients = [
  { id: 'c1', name: 'Ana', lastname: 'Gómez', phone: '099111222', email: 'ana@test.com', photoUrl: null },
  { id: 'c2', name: 'Luis', lastname: 'Pérez', phone: '', email: 'luis@test.com', photoUrl: 'http://img/luis.jpg' },
];
const mockSearchClients = mockRegisteredClients.map((client) => ({
  id: client.id,
  name: client.name,
  lastname: client.lastname,
  phone: client.phone,
  contactEmail: client.email,
  photoUrl: client.photoUrl,
}));

vi.mock('../../../services/service.api', () => ({
  useGetServicesQuery: vi.fn(() => ({ data: mockServices })),
}));

vi.mock('../../../services/appointmentApi', () => ({
  useCreateAdminAppointmentMutation: vi.fn(() => [mockCreateAppointment, { isLoading: false }]),
  useAcquireTempLockMutation: vi.fn(() => [mockAcquireTempLock, { isLoading: false }]),
  useReleaseTempLockMutation: vi.fn(() => [mockReleaseTempLock, { isLoading: false }]),
  useLazySearchClientsQuery: vi.fn(() => [vi.fn(), { data: mockSearchClients, isFetching: false }]),
}));

vi.mock('../../../services/clientApi', () => ({
  useGetRegisteredClientsQuery: vi.fn(() => ({
    data: { clients: mockRegisteredClients },
    isFetching: false,
  })),
}));

vi.mock('../../../services/professional.service', () => ({
  professionalService: {
    getPublic: vi.fn(() => Promise.resolve(mockBarbers)),
    getSlots: vi.fn(() => Promise.resolve({ slots: mockSlots })),
  },
}));

describe('QuickCreateModal', () => {
  beforeEach(() => {
    mockCreateAppointment.mockClear();
    mockAcquireTempLock.mockClear();
    mockReleaseTempLock.mockClear();
  });

  it('renders modal title with date', () => {
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);
    expect(screen.getByText(/nuevo turno/i)).toBeInTheDocument();
    expect(screen.getByText(/05\/07\/2026/i)).toBeInTheDocument();
  });

  it('renders all required form fields', () => {
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);
    expect(screen.getByText(/nombre/i)).toBeInTheDocument();
    expect(screen.getByText(/apellido/i)).toBeInTheDocument();
    expect(screen.getByText(/teléfono/i)).toBeInTheDocument();
    expect(screen.getByText(/email/i)).toBeInTheDocument();
  });

  it('renders barber select after loading barbers', async () => {
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText(/seleccionar barbero/i)).toBeInTheDocument();
    });
  });

  it('creates appointment on submit with valid data', async () => {
    const onClose = vi.fn();
    mockCreateAppointment.mockResolvedValueOnce({});

    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText(/seleccionar barbero/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /crear turno/i }));
    expect(mockCreateAppointment).not.toHaveBeenCalled();
  });

  it('hides the client inputs and shows the searchable client list (with photos) when "cliente registrado" is selected', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    expect(screen.getByLabelText(/^nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cliente registrado/i }));

    expect(screen.queryByLabelText(/^nombre/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/apellido/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/buscar cliente/i), 'ana');

    await user.click(screen.getByText('Ana Gómez'));

    expect(screen.getByText('ana@test.com')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^teléfono/i)).not.toBeInTheDocument();
  });

  it('shows the phone field when the selected registered client has no phone on file', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /cliente registrado/i }));
    await user.type(screen.getByLabelText(/buscar cliente/i), 'luis');

    await user.click(screen.getByText('Luis Pérez'));

    expect(screen.queryByLabelText(/apellido/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^teléfono/i)).not.toBeDisabled();
    expect(screen.getByText(/este cliente no tiene teléfono cargado/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^teléfono/i), '099555666');
    expect(screen.getByDisplayValue('099555666')).toBeInTheDocument();
  });

  it('requires selecting a client when in "cliente registrado" mode', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/seleccionar barbero/i)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/seleccionar barbero/i));
    await user.click(await screen.findByText('Juan Pérez'));

    await user.click(screen.getByText(/seleccionar servicio/i));
    await user.click(await screen.findByText(/corte/i));

    await user.click(screen.getByText(/seleccionar horario/i));
    await user.click(await screen.findByText('10:00 a 10:30'));

    await user.click(screen.getByRole('button', { name: /cliente registrado/i }));
    await user.click(screen.getByRole('button', { name: /crear turno/i }));

    expect(await screen.findByText(/buscá y seleccioná un cliente/i)).toBeInTheDocument();
    expect(mockCreateAppointment).not.toHaveBeenCalled();
  }, 15000);

  it('opens in data-entry mode with prefilled fields when the initial client is anonymous', () => {
    renderWithProviders(
      <QuickCreateModal
        dateStr="2026-07-05"
        onClose={vi.fn()}
        initialClient={{
          id: 'anon-1',
          name: 'Carlos',
          lastname: 'Ruiz',
          phone: '099111333',
          email: 'carlos@test.com',
          kind: 'anonymous',
        }}
      />
    );

    expect(screen.getByLabelText(/^nombre/i)).toHaveValue('Carlos');
    expect(screen.getByLabelText(/apellido/i)).toHaveValue('Ruiz');
    expect(screen.getByLabelText(/^teléfono/i)).toHaveValue('099111333');
    expect(screen.getByLabelText(/email/i)).toHaveValue('carlos@test.com');
    expect(screen.queryByLabelText(/buscar cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sin resultados/i)).not.toBeInTheDocument();
  });

  it('falls back to data-entry mode when the initial client is not in the registered list', async () => {
    renderWithProviders(
      <QuickCreateModal
        dateStr="2026-07-05"
        onClose={vi.fn()}
        initialClient={{
          id: 'anon-1',
          name: 'Carlos',
          lastname: 'Ruiz',
          phone: '099111333',
          email: 'carlos@test.com',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/^nombre/i)).toHaveValue('Carlos');
    });
    expect(screen.getByLabelText(/^teléfono/i)).toHaveValue('099111333');
    expect(screen.queryByLabelText(/buscar cliente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sin resultados/i)).not.toBeInTheDocument();
  });

  it('finds the prefilled registered client when searching full name and lastname', () => {
    renderWithProviders(
      <QuickCreateModal
        dateStr="2026-07-05"
        onClose={vi.fn()}
        initialClient={{
          id: 'c2',
          name: 'Luis',
          lastname: 'Pérez',
          phone: '',
          email: 'luis@test.com',
          kind: 'registered',
        }}
      />
    );

    expect(screen.getByLabelText(/buscar cliente/i)).toHaveValue('Luis Pérez');
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    expect(screen.queryByText(/sin resultados/i)).not.toBeInTheDocument();
  });

  it('muestra la hora de fin y la duración del turno al elegir un horario', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await user.click(await screen.findByText(/seleccionar barbero/i));
    await user.click(await screen.findByText('Juan Pérez'));
    await user.click(screen.getByText(/seleccionar servicio/i));
    await user.click(await screen.findByText(/corte/i));
    await user.click(screen.getByText(/seleccionar horario/i));
    await user.click(await screen.findByText('10:00 a 10:30'));

    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('10:30')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
  }, 15000);

  it('permite elegir un horario fuera de agenda en formato 24 h y lo envía tal cual', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await user.click(await screen.findByText(/seleccionar barbero/i));
    await user.click(await screen.findByText('Juan Pérez'));
    await user.click(screen.getByText(/seleccionar servicio/i));
    await user.click(await screen.findByText(/corte/i));

    await user.click(screen.getByRole('button', { name: 'Fuera de agenda' }));
    await user.click(screen.getByRole('button', { name: 'HH' }));
    await user.click(screen.getByRole('option', { name: '21' }));

    expect(screen.getByText('21:00')).toBeInTheDocument();
    expect(screen.getByText('21:30')).toBeInTheDocument();
    expect(
      screen.getByText(/el cliente no lo verá al reservar/i)
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^nombre/i), 'Pedro');
    await user.type(screen.getByLabelText(/apellido/i), 'Fran');
    await user.click(screen.getByRole('button', { name: /crear turno/i }));

    await waitFor(() => {
      expect(mockCreateAppointment).toHaveBeenCalledWith(
        expect.objectContaining({ startTime: '21:00' })
      );
    });
  }, 15000);

  it('no ofrece una hora de inicio que termine después de las 23:59', async () => {
    const user = userEvent.setup();
    renderWithProviders(<QuickCreateModal dateStr="2026-07-05" onClose={vi.fn()} />);

    await user.click(await screen.findByText(/seleccionar barbero/i));
    await user.click(await screen.findByText('Juan Pérez'));

    await user.click(screen.getByRole('button', { name: 'Fuera de agenda' }));
    await user.click(screen.getByRole('button', { name: 'HH' }));
    await user.click(screen.getByRole('option', { name: '23' }));

    await user.click(screen.getByRole('button', { name: '00' }));
    const listbox = screen.getByRole('listbox');
    expect(within(listbox).queryByText('30')).not.toBeInTheDocument();
    expect(within(listbox).getByText('25')).toBeInTheDocument();
  }, 15000);
});
