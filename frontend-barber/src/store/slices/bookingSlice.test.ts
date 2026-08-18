import { describe, expect, it, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import type { PaymentMethod } from '../../types/booking';
import reducer, {
  setServices,
  setCurrentStep,
  restoreBookingFlow,
  setSelectedBarber,
  setSelectedService,
  setSelectedDate,
  setSelectedTime,
  setPaymentMethod,
  setClientData,
  clearBookingError,
  resetBooking,
  resetBookingFlow,
  fetchPublicBarbers,
  fetchAvailableSlots,
  submitAppointment,
} from './bookingSlice';

const initialState = {
  async: {
    barbers: [],
    services: [],
    availableSlots: [],
    isLoadingBarbers: true,
    isLoadingServices: false,
    isLoadingSlots: false,
    isConfirming: false,
    barbersError: null,
    servicesError: null,
    slotsError: null,
    confirmError: null,
    emailRegisteredError: false,
    createdAppointment: null,
    submitSuccess: false,
  },
  flow: {
    currentStep: 'barber' as const,
    selectedBarber: null,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    clientName: '',
    clientLastname: '',
    clientPhone: '',
    clientEmail: '',
    paymentMethod: 'local' as PaymentMethod,
  },
};

const mockProfessionalService = vi.hoisted(() => ({
  getPublic: vi.fn(),
  getSlots: vi.fn(),
}));

const mockAppointmentService = vi.hoisted(() => ({
  create: vi.fn(),
}));

const mockTempLockService = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn().mockResolvedValue(undefined),
}));

const mockAcquireLock = vi.hoisted(() => vi.fn());
const mockCreateAppointment = vi.hoisted(() => vi.fn());
const mockReleaseLock = vi.hoisted(() => vi.fn());

vi.mock('../../services/professional.service', () => ({
  professionalService: mockProfessionalService,
}));

vi.mock('../../services/appointment.service', () => ({
  appointmentService: mockAppointmentService,
  tempLockService: mockTempLockService,
}));

vi.mock('../../services/appointmentApi', () => ({
  appointmentApi: {
    endpoints: {
      acquireTempLock: { initiate: mockAcquireLock },
      createAppointment: { initiate: mockCreateAppointment },
      releaseTempLock: { initiate: mockReleaseLock },
    },
  },
}));

const workingDay = { startTime: '09:00', endTime: '18:00', breaks: [] };
const mockSchedule = {
  monday: workingDay, tuesday: workingDay, wednesday: workingDay, thursday: workingDay,
  friday: workingDay, saturday: workingDay, sunday: { startTime: null, endTime: null, breaks: [] },
};
const mockBarber = { id: 'b1', name: 'Carlos', lastname: 'López', services: ['s1'], photoUrl: null, isActive: true, slotDuration: 30, maxAdvanceDays: 30, schedule: mockSchedule };
const mockService = { id: 's1', name: 'Corte', description: '', price: 500, imageUrl: '', status: 'active' as const };

function createStore(preloaded?: Partial<ReturnType<typeof reducer>>) {
  return configureStore({
    reducer: { booking: reducer },
    preloadedState: preloaded ? { booking: preloaded as ReturnType<typeof reducer> } : { booking: initialState },
  });
}

describe('bookingSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAcquireLock.mockImplementation(() => () => ({ unwrap: () => Promise.resolve({ tempLockId: 'lock-123', ownerToken: 'a'.repeat(64) }) }));
    mockReleaseLock.mockImplementation(() => () => ({ unwrap: () => Promise.resolve(undefined) }));
  });

  describe('estado inicial', () => {
    it('retorna el estado inicial', () => {
      expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });
  });

  describe('reducers', () => {
    it('setCurrentStep actualiza el paso actual', () => {
      const state = reducer(initialState, setCurrentStep('datetime'));
      expect(state.flow.currentStep).toBe('datetime');
    });

    it('restoreBookingFlow recupera el borrador sin tocar el estado async', () => {
      const state = reducer(
        { ...initialState, async: { ...initialState.async, barbers: [mockBarber] } },
        restoreBookingFlow({ currentStep: 'service', selectedBarber: mockBarber, clientName: 'Juan' })
      );

      expect(state.flow.currentStep).toBe('service');
      expect(state.flow.selectedBarber).toEqual(mockBarber);
      expect(state.flow.clientName).toBe('Juan');
      expect(state.async.barbers).toEqual([mockBarber]);
    });

    it('setSelectedBarber selecciona barbero y avanza a service', () => {
      const state = reducer(initialState, setSelectedBarber(mockBarber));
      expect(state.flow.selectedBarber).toEqual(mockBarber);
      expect(state.flow.currentStep).toBe('service');
      expect(state.flow.selectedDate).toBeNull();
      expect(state.flow.selectedTime).toBeNull();
      expect(state.async.availableSlots).toEqual([]);
      expect(state.async.isLoadingSlots).toBe(false);
    });

    it('setSelectedBarber con null mantiene el paso actual', () => {
      const state = reducer(initialState, setSelectedBarber(null));
      expect(state.flow.selectedBarber).toBeNull();
      expect(state.flow.currentStep).toBe('barber');
    });

    it('setSelectedService selecciona servicio y avanza a datetime', () => {
      const state = reducer(initialState, setSelectedService(mockService));
      expect(state.flow.selectedService).toEqual(mockService);
      expect(state.flow.currentStep).toBe('datetime');
    });

    it('setSelectedService con null mantiene el paso', () => {
      const state = reducer(initialState, setSelectedService(null));
      expect(state.flow.selectedService).toBeNull();
      expect(state.flow.currentStep).toBe('barber');
    });

    it('setSelectedDate asigna fecha y limpia hora y slots', () => {
      const state = reducer(
        { ...initialState, flow: { ...initialState.flow, selectedTime: '10:00' } },
        setSelectedDate('2025-06-16')
      );
      expect(state.flow.selectedDate).toBe('2025-06-16');
      expect(state.flow.selectedTime).toBeNull();
      expect(state.async.availableSlots).toEqual([]);
      expect(state.async.isLoadingSlots).toBe(true);
    });

    it('setSelectedTime asigna la hora', () => {
      const state = reducer(initialState, setSelectedTime('10:00'));
      expect(state.flow.selectedTime).toBe('10:00');
    });

    it('setPaymentMethod actualiza el método de pago', () => {
      const state = reducer(initialState, setPaymentMethod('memberPass'));
      expect(state.flow.paymentMethod).toBe('memberPass');
    });

    it('setServices asigna servicios desde RTK Query', () => {
      const svcs = [mockService];
      const state = reducer(initialState, setServices(svcs));
      expect(state.async.services).toEqual(svcs);
    });

    it('setClientData asigna datos del cliente', () => {
      const data = { name: 'Juan', lastname: 'Pérez', phone: '123456789', email: 'juan@test.com' };
      const state = reducer(initialState, setClientData(data));
      expect(state.flow.clientName).toBe('Juan');
      expect(state.flow.clientLastname).toBe('Pérez');
      expect(state.flow.clientPhone).toBe('123456789');
      expect(state.flow.clientEmail).toBe('juan@test.com');
    });

    it('clearBookingError limpia todos los errores', () => {
      const stateWithErrors = {
        ...initialState,
        async: { ...initialState.async, barbersError: 'Error1', servicesError: 'Error2', slotsError: 'Error3', confirmError: 'Error4' },
      };
      const state = reducer(stateWithErrors, clearBookingError());
      expect(state.async.barbersError).toBeNull();
      expect(state.async.servicesError).toBeNull();
      expect(state.async.slotsError).toBeNull();
      expect(state.async.confirmError).toBeNull();
    });

    it('resetBooking reinicia todo el estado', () => {
      const modified = {
        async: { ...initialState.async, isConfirming: true, submitSuccess: true },
        flow: { ...initialState.flow, currentStep: 'datetime' as const },
      };
      const state = reducer(modified, resetBooking());
      expect(state).toEqual(initialState);
    });

    it('resetBookingFlow reinicia solo el flujo y submit', () => {
      const modified = {
        async: { ...initialState.async, barbers: [mockBarber], submitSuccess: true, isConfirming: true },
        flow: { ...initialState.flow, currentStep: 'datetime' as const, selectedBarber: mockBarber },
      };
      const state = reducer(modified, resetBookingFlow());
      expect(state.flow).toEqual(initialState.flow);
      expect(state.async.submitSuccess).toBe(false);
      expect(state.async.createdAppointment).toBeNull();
      expect(state.async.isConfirming).toBe(false);
      expect(state.async.confirmError).toBeNull();
      expect(state.async.barbers).toEqual([mockBarber]);
    });
  });

  describe('fetchPublicBarbers', () => {
    it('pending activa isLoadingBarbers y limpia error', () => {
      const state = reducer(initialState, { type: fetchPublicBarbers.pending.type });
      expect(state.async.isLoadingBarbers).toBe(true);
      expect(state.async.barbersError).toBeNull();
    });

    it('fulfilled asigna barberos y desactiva loading', async () => {
      const barbers = [mockBarber];
      mockProfessionalService.getPublic.mockResolvedValueOnce(barbers);
      const store = createStore();
      await store.dispatch(fetchPublicBarbers());
      const state = store.getState().booking;
      expect(state.async.isLoadingBarbers).toBe(false);
      expect(state.async.barbers).toEqual(barbers);
    });

    it('rejected asigna error y desactiva loading', async () => {
      mockProfessionalService.getPublic.mockRejectedValueOnce(new Error('Error al cargar'));
      const store = createStore();
      await store.dispatch(fetchPublicBarbers());
      const state = store.getState().booking;
      expect(state.async.isLoadingBarbers).toBe(false);
      expect(state.async.barbersError).toBe('Error al cargar');
    });

    it('rejected con error no estándar usa mensaje por defecto', async () => {
      mockProfessionalService.getPublic.mockRejectedValueOnce('string error');
      const store = createStore();
      await store.dispatch(fetchPublicBarbers());
      const state = store.getState().booking;
      expect(state.async.barbersError).toBe('Error al cargar barberos');
    });
  });

  describe('fetchAvailableSlots', () => {
    it('fulfilled asigna slots', async () => {
      mockProfessionalService.getSlots.mockResolvedValueOnce({ date: '2025-06-16', slots: ['10:00', '11:00'] });
      const store = createStore();
      await store.dispatch(fetchAvailableSlots({ barberId: 'b1', date: '2025-06-16' }));
      const state = store.getState().booking;
      expect(state.async.isLoadingSlots).toBe(false);
      expect(state.async.availableSlots).toEqual(['10:00', '11:00']);
    });

    it('rejected asigna error', async () => {
      mockProfessionalService.getSlots.mockRejectedValueOnce(new Error('Sin horarios'));
      const store = createStore();
      await store.dispatch(fetchAvailableSlots({ barberId: 'b1', date: '2025-06-16' }));
      const state = store.getState().booking;
      expect(state.async.slotsError).toBe('Sin horarios');
    });

    it('fulfilled asigna slotsReason cuando no hay slots disponibles', async () => {
      mockProfessionalService.getSlots.mockResolvedValueOnce({ date: '2025-06-16', slots: [], reason: 'already-past' });
      const store = createStore();
      await store.dispatch(fetchAvailableSlots({ barberId: 'b1', date: '2025-06-16' }));
      const state = store.getState().booking;
      expect(state.async.availableSlots).toEqual([]);
      expect(state.async.slotsReason).toBe('already-past');
    });
  });

  describe('submitAppointment', () => {
    const filledFlow = {
      currentStep: 'datetime' as const,
      selectedBarber: mockBarber,
      selectedService: mockService,
      selectedDate: '2025-06-16',
      selectedTime: '10:00',
      clientName: 'Juan',
      clientLastname: 'Pérez',
      clientPhone: '123456789',
      clientEmail: 'juan@test.com',
      paymentMethod: 'local' as PaymentMethod,
    };

    function createStoreWithFlow() {
      return createStore({ ...initialState, flow: filledFlow });
    }

    it('fulfilled crea cita y retorna appointment', async () => {
      const appointmentData = { id: 'apt-1', barberId: 'b1', serviceId: 's1', date: '2025-06-16' };
      mockCreateAppointment.mockImplementation(() => () => ({
        unwrap: () => Promise.resolve({ appointment: appointmentData }),
      }));
      const store = createStoreWithFlow();
      await store.dispatch(submitAppointment());
      const state = store.getState().booking;
      expect(state.async.isConfirming).toBe(false);
      expect(state.async.submitSuccess).toBe(true);
      expect(state.async.createdAppointment).toEqual(appointmentData);
      expect(mockAcquireLock).toHaveBeenCalledWith({ barberId: 'b1', date: '2025-06-16', startTime: '10:00' });
      expect(mockCreateAppointment).toHaveBeenCalledWith({
        barberId: 'b1', serviceId: 's1', date: '2025-06-16', startTime: '10:00',
        clientName: 'Juan', clientLastname: 'Pérez', clientPhone: '123456789', clientEmail: 'juan@test.com',
        paymentMethod: 'local', tempLockId: 'lock-123',
      });
      expect(mockReleaseLock).toHaveBeenCalledWith({ tempLockId: 'lock-123', ownerToken: 'a'.repeat(64) });
    });

    it('rejected libera temp lock y asigna error', async () => {
      mockCreateAppointment.mockImplementation(() => () => ({
        unwrap: () => Promise.reject(new Error('Horario no disponible')),
      }));
      const store = createStoreWithFlow();
      await store.dispatch(submitAppointment());
      const state = store.getState().booking;
      expect(state.async.isConfirming).toBe(false);
      expect(state.async.confirmError).toBe('Horario no disponible');
      expect(mockReleaseLock).toHaveBeenCalledWith({ tempLockId: 'lock-123', ownerToken: 'a'.repeat(64) });
    });

    it('rejected sin temp lock no intenta liberar', async () => {
      mockAcquireLock.mockImplementation(() => () => ({
        unwrap: () => Promise.reject(new Error('Bloqueo fallido')),
      }));
      const store = createStoreWithFlow();
      await store.dispatch(submitAppointment());
      const state = store.getState().booking;
      expect(state.async.confirmError).toBe('Bloqueo fallido');
      expect(mockReleaseLock).not.toHaveBeenCalled();
    });

    it('rejected por sanción muestra el mensaje del servidor (error.data.error)', async () => {
      mockCreateAppointment.mockImplementation(() => () => ({
        unwrap: () => Promise.reject({
          status: 403,
          error: 'Rejected',
          originalStatus: 403,
          data: { error: 'Estás sancionado por inasistencias y no podés reservar turnos.' },
        }),
      }));
      const store = createStoreWithFlow();
      await store.dispatch(submitAppointment());
      const state = store.getState().booking;
      expect(state.async.confirmError).toBe('Estás sancionado por inasistencias y no podés reservar turnos.');
    });

    it('rejected con code EMAIL_ALREADY_REGISTERED expone emailRegisteredError', async () => {
      mockCreateAppointment.mockImplementation(() => () => ({
        unwrap: () => Promise.reject({
          status: 409,
          error: 'Rejected',
          originalStatus: 409,
          data: {
            error: 'Este email ya está registrado. Iniciá sesión para reservar tu turno.',
            code: 'EMAIL_ALREADY_REGISTERED',
          },
        }),
      }));
      const store = createStoreWithFlow();
      await store.dispatch(submitAppointment());
      const state = store.getState().booking;
      expect(state.async.confirmError).toBe('Este email ya está registrado. Iniciá sesión para reservar tu turno.');
      expect(state.async.emailRegisteredError).toBe(true);
    });

    it('rejected con code a nivel superior (baseQuery) expone emailRegisteredError', async () => {
      mockCreateAppointment.mockImplementation(() => () => ({
        unwrap: () => Promise.reject({
          status: 409,
          error: 'Rejected',
          originalStatus: 409,
          data: 'Este email ya está registrado. Iniciá sesión para reservar tu turno.',
          code: 'EMAIL_ALREADY_REGISTERED',
        }),
      }));
      const store = createStoreWithFlow();
      await store.dispatch(submitAppointment());
      const state = store.getState().booking;
      expect(state.async.confirmError).toBe('Este email ya está registrado. Iniciá sesión para reservar tu turno.');
      expect(state.async.emailRegisteredError).toBe(true);
    });
  });
});
