import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDispatch = vi.fn(() => ({ abort: vi.fn() }));
let mockReduxState: Record<string, unknown> = {};

vi.mock('../../../store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: Record<string, unknown>) => unknown) =>
    selector(mockReduxState),
}));

vi.mock('../../../services/authApi', () => ({
  authApi: {
    endpoints: {
      getProfile: {
        initiate: vi.fn(() => ({ type: 'auth/getProfile/initiate' })),
      },
    },
  },
}));

vi.mock('../../../services/service.api', () => ({
  useGetServicesQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('../../../services/api', () => ({
  getAccessToken: vi.fn(() => null),
}));

vi.mock('../../../components/client/booking', () => ({
  AccordionStep: ({
    children,
    title,
    summary,
    isExpanded,
    isCompleted,
    isLocked,
    onToggle,
  }: Record<string, unknown>) => (
    <div
      data-testid={`accordion-${String(title)}`}
      data-expanded={String(isExpanded)}
      data-completed={String(isCompleted)}
      data-locked={String(isLocked)}
    >
      <button data-testid="accordion-toggle" onClick={onToggle as () => void}>
        {String(title)}
      </button>
      {summary && <span data-testid="step-summary">{String(summary)}</span>}
      {isExpanded && <div data-testid="accordion-content">{children}</div>}
    </div>
  ),
  BarberSelectionStep: ({ barbers, isLoading, error }: Record<string, unknown>) => (
    <div
      data-testid="barber-selection-step"
      data-count={Array.isArray(barbers) ? barbers.length : 0}
      data-loading={String(isLoading)}
      data-error={String(!!error)}
    />
  ),
  ServiceSelectionStep: ({ services, isLoading }: Record<string, unknown>) => (
    <div
      data-testid="service-selection-step"
      data-count={Array.isArray(services) ? services.length : 0}
      data-loading={String(isLoading)}
    />
  ),
  DateTimeStep: ({ barberId, maxAdvanceDays }: Record<string, unknown>) => (
    <div
      data-testid="datetime-step"
      data-barber-id={String(barberId)}
      data-max-days={String(maxAdvanceDays)}
    />
  ),
  ClientDataOverlay: ({ isOpen, onSubmit, onClose }: Record<string, unknown>) => (
    <div data-testid="client-overlay" data-open={String(isOpen)}>
      {isOpen && (
        <button data-testid="confirm-btn" onClick={onSubmit as () => void}>
          Confirmar reserva
        </button>
      )}
    </div>
  ),
  BookingSuccessModal: ({ isOpen, onClose }: Record<string, unknown>) => (
    <div data-testid="success-modal" data-open={String(isOpen)}>
      {isOpen && <button onClick={onClose as () => void}>Volver al inicio</button>}
    </div>
  ),
}));

import BookingPage from './index';

function renderPage() {
  return render(
    <MemoryRouter>
      <BookingPage />
    </MemoryRouter>
  );
}

const DEFAULT_STATE = {
  auth: { user: null },
  booking: {
    async: {
      barbers: [],
      services: [],
      availableSlots: [],
      isLoadingBarbers: false,
      isLoadingServices: false,
      isLoadingSlots: false,
      isConfirming: false,
      barbersError: null,
      servicesError: null,
      slotsError: null,
      confirmError: null,
      createdAppointment: null,
      submitSuccess: false,
    },
    flow: {
      currentStep: 'barber',
      selectedBarber: null,
      selectedService: null,
      selectedDate: null,
      selectedTime: null,
      clientName: '',
      clientLastname: '',
      clientPhone: '',
      clientEmail: '',
    },
  },
};

const buildState = (overrides: Record<string, unknown> = {}): Record<string, unknown> => {
  const result = { ...DEFAULT_STATE };
  if (overrides.auth) {
    result.auth = { ...result.auth, ...(overrides.auth as Record<string, unknown>) };
  }
  if (overrides.booking) {
    const bookingOverride = overrides.booking as Record<string, unknown>;
    result.booking = { ...result.booking };
    if (bookingOverride.async) {
      result.booking.async = { ...result.booking.async, ...(bookingOverride.async as Record<string, unknown>) };
    }
    if (bookingOverride.flow) {
      result.booking.flow = { ...result.booking.flow, ...(bookingOverride.flow as Record<string, unknown>) };
    }
  }
  return result as Record<string, unknown>;
};

const barberStub = {
  id: 'b1',
  name: 'Carlos',
  lastname: 'López',
  services: ['corte'],
  photoUrl: null,
  isActive: true,
  slotDuration: 30,
  maxAdvanceDays: 30,
};

const serviceStub = {
  id: 's1',
  name: 'Corte',
  description: 'Corte clásico',
  price: 1500,
  imageUrl: '',
};

describe('BookingPage', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockReduxState = {};
  });

  it('renders heading and description', () => {
    mockReduxState = buildState();
    renderPage();

    expect(screen.getByText('Agendá tu cita en segundos')).toBeInTheDocument();
    expect(screen.getByText(/Elegí barbero, servicio y horario/i)).toBeInTheDocument();
  });

  it('renders step 1 (barber) expanded by default', () => {
    mockReduxState = buildState();
    renderPage();

    const step1 = screen.getByTestId('accordion-Tu barbero');
    expect(step1).toHaveAttribute('data-expanded', 'true');
    expect(step1).toHaveAttribute('data-completed', 'false');
    expect(step1).toHaveAttribute('data-locked', 'false');

    const step2 = screen.getByTestId('accordion-Servicio');
    expect(step2).toHaveAttribute('data-locked', 'true');

    const step3 = screen.getByTestId('accordion-Fecha y hora');
    expect(step3).toHaveAttribute('data-locked', 'true');
  });

  it('renders BarberSelectionStep with barbers from state', () => {
    mockReduxState = buildState({
      booking: { async: { barbers: [barberStub] } },
    });
    renderPage();

    expect(screen.getByTestId('barber-selection-step')).toHaveAttribute('data-count', '1');
  });

  it('advances to service step when barber is selected', () => {
    mockReduxState = buildState({
      booking: {
        async: { barbers: [barberStub] },
        flow: { selectedBarber: barberStub, currentStep: 'service' },
      },
    });
    renderPage();

    expect(screen.getByTestId('accordion-Tu barbero')).toHaveAttribute('data-completed', 'true');
    expect(screen.getByTestId('accordion-Servicio')).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByTestId('service-selection-step')).toBeInTheDocument();
  });

  it('shows step 1 summary with barber name when barber selected', () => {
    mockReduxState = buildState({
      booking: {
        async: { barbers: [barberStub] },
        flow: { selectedBarber: barberStub, currentStep: 'service' },
      },
    });
    renderPage();

    expect(screen.getByTestId('step-summary')).toHaveTextContent('Carlos López');
  });

  it('renders ServiceSelectionStep when service step is active', () => {
    mockReduxState = buildState({
      booking: {
        async: { services: [serviceStub] },
        flow: { selectedBarber: barberStub, currentStep: 'service' },
      },
    });
    renderPage();

    expect(screen.getByTestId('service-selection-step')).toHaveAttribute('data-count', '1');
  });

  it('shows step 2 summary with service name and price when service selected', () => {
    mockReduxState = buildState({
      booking: {
        async: { services: [serviceStub] },
        flow: {
          selectedBarber: barberStub,
          selectedService: serviceStub,
          currentStep: 'datetime',
        },
      },
    });
    renderPage();

    const summaries = screen.getAllByTestId('step-summary');
    expect(summaries[1]).toHaveTextContent('Corte · $1500');
  });

  it('renders DateTimeStep with barberId when barber and service are selected', () => {
    mockReduxState = buildState({
      booking: {
        async: { services: [serviceStub] },
        flow: {
          selectedBarber: barberStub,
          selectedService: serviceStub,
          currentStep: 'datetime',
        },
      },
    });
    renderPage();

    const dtStep = screen.getByTestId('datetime-step');
    expect(dtStep).toHaveAttribute('data-barber-id', 'b1');
    expect(dtStep).toHaveAttribute('data-max-days', '30');
  });

  it('shows client overlay when all booking steps are complete', async () => {
    mockReduxState = buildState({
      booking: {
        flow: {
          selectedBarber: barberStub,
          selectedService: serviceStub,
          selectedDate: '2026-06-20',
          selectedTime: '10:00',
          currentStep: 'datetime',
        },
      },
    });
    renderPage();

    const overlay = screen.getByTestId('client-overlay');
    expect(overlay).toHaveAttribute('data-open', 'true');
  });

  it('shows success modal when submitSuccess is true', () => {
    mockReduxState = buildState({
      booking: {
        async: {
          submitSuccess: true,
          createdAppointment: {
            id: 'appt1',
            barberId: 'b1',
            clientName: 'Test',
            clientLastname: 'User',
            serviceId: 's1',
            serviceName: 'Corte',
            servicePrice: 1500,
            serviceDuration: 30,
            date: '2026-06-20',
            startTime: '10:00',
            endTime: '10:30',
            status: 'Confirmado',
            paymentStatus: 'Pendiente',
            paymentMethod: 'local',
            createdAt: '',
            updatedAt: '',
          },
        },
        flow: {
          selectedBarber: barberStub,
          selectedService: serviceStub,
          selectedDate: '2026-06-20',
          selectedTime: '10:00',
          currentStep: 'datetime',
        },
      },
    });
    renderPage();

    expect(screen.getByTestId('success-modal')).toHaveAttribute('data-open', 'true');
  });

  it('dispatches setCurrentStep when accordion toggle is clicked', async () => {
    const user = userEvent.setup();
    mockReduxState = buildState({
      booking: {
        async: { barbers: [barberStub] },
        flow: {
          selectedBarber: barberStub,
          currentStep: 'barber',
        },
      },
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Servicio' }));

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'booking/setCurrentStep', payload: 'service' })
    );
  });

  it('handles full flow: dispatches submitAppointment on confirm', async () => {
    const user = userEvent.setup();
    mockReduxState = buildState({
      booking: {
        flow: {
          selectedBarber: barberStub,
          selectedService: serviceStub,
          selectedDate: '2026-06-20',
          selectedTime: '10:00',
          currentStep: 'datetime',
          clientName: 'Test',
          clientLastname: 'User',
          clientPhone: '099123456',
          clientEmail: 'test@mail.com',
        },
      },
    });
    renderPage();

    const overlay = screen.getByTestId('client-overlay');
    expect(overlay).toHaveAttribute('data-open', 'true');

    await user.click(screen.getByTestId('confirm-btn'));

    // submitAppointment() returns a thunk function, not a plain action
    const thunkCalls = mockDispatch.mock.calls.filter(
      ([arg]: unknown[]) => typeof arg === 'function'
    );
    expect(thunkCalls.length).toBeGreaterThan(0);
  });
});
