import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { professionalService } from '../../services/professional.service';
import { appointmentApi } from '../../services/appointmentApi';
import type {
  BarberPublic,
  PaymentMethod,
  Service,
  Appointment,
  BookingStep,
  CreateAppointmentPayload,
} from '../../types/booking';
import type { SlotsReason } from '../../types/professional';

interface BookingAsyncState {
  barbers: BarberPublic[];
  services: Service[];
  availableSlots: string[];
  slotsReason?: SlotsReason;
  isLoadingBarbers: boolean;
  isLoadingServices: boolean;
  isLoadingSlots: boolean;
  isConfirming: boolean;
  barbersError: string | null;
  servicesError: string | null;
  slotsError: string | null;
  confirmError: string | null;
  createdAppointment: Appointment | null;
  submitSuccess: boolean;
  preferenceId?: string;
}

interface BookingFlowState {
  currentStep: BookingStep;
  selectedBarber: BarberPublic | null;
  selectedService: Service | null;
  selectedDate: string | null;
  selectedTime: string | null;
  clientName: string;
  clientLastname: string;
  clientPhone: string;
  clientEmail: string;
  paymentMethod: PaymentMethod;
}

interface BookingState {
  async: BookingAsyncState;
  flow: BookingFlowState;
}

const initialState: BookingState = {
  async: {
    barbers: [],
    services: [],
    availableSlots: [],
    slotsReason: undefined,
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
    paymentMethod: 'local',
  },
};

export const fetchPublicBarbers = createAsyncThunk(
  'booking/fetchPublicBarbers',
  async (_, { rejectWithValue }) => {
    try {
      return await professionalService.getPublic();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar barberos';
      return rejectWithValue(message);
    }
  }
);

export const fetchAvailableSlots = createAsyncThunk(
  'booking/fetchAvailableSlots',
  async (
    { barberId, date }: { barberId: string; date: string },
    { rejectWithValue }
  ) => {
    try {
      return await professionalService.getSlots(barberId, date);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar horarios';
      return rejectWithValue(message);
    }
  }
);

export const submitAppointment = createAsyncThunk(
  'booking/submitAppointment',
  async (_, { getState, rejectWithValue, dispatch }) => {
    let tempLockId: string | undefined;
    try {
      const { flow } = (getState() as { booking: BookingState }).booking;
      const barberId = flow.selectedBarber!.id;
      const date = flow.selectedDate!;
      const startTime = flow.selectedTime!;
      const lockResult = await dispatch(appointmentApi.endpoints.acquireTempLock.initiate({ barberId, date, startTime })).unwrap();
      tempLockId = lockResult.tempLockId;
      const payload: CreateAppointmentPayload = {
        barberId,
        serviceId: flow.selectedService!.id,
        date,
        startTime,
        clientName: flow.clientName,
        clientLastname: flow.clientLastname,
        clientPhone: flow.clientPhone,
        clientEmail: flow.clientEmail,
        paymentMethod: flow.paymentMethod,
        tempLockId,
      };
      const response = await dispatch(appointmentApi.endpoints.createAppointment.initiate(payload)).unwrap();

      if (response.preferenceId) {
        return { ...response.appointment, preferenceId: response.preferenceId };
      }

      return response.appointment;
    } catch (error: unknown) {
      let message = 'Error al crear la reserva';
      if (error && typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        const data = errObj.data;
        if (data && typeof data === 'object') {
          const payload = data as Record<string, unknown>;
          if (typeof payload.error === 'string') {
            message = payload.error;
          } else if (typeof payload.message === 'string') {
            message = payload.message;
          }
        } else if (typeof data === 'string') {
          message = data;
        } else if (typeof errObj.message === 'string') {
          message = errObj.message;
        } else if (typeof errObj.error === 'string') {
          message = errObj.error;
        }
      }
      return rejectWithValue(message);
    } finally {
      if (tempLockId) {
        dispatch(appointmentApi.endpoints.releaseTempLock.initiate(tempLockId));
      }
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setServices: (state, action: PayloadAction<Service[]>) => {
      state.async.services = action.payload;
    },
    setCurrentStep: (state, action: PayloadAction<BookingStep>) => {
      state.flow.currentStep = action.payload;
    },
    setSelectedBarber: (state, action: PayloadAction<BarberPublic | null>) => {
      state.flow.selectedBarber = action.payload;
      state.flow.selectedDate = null;
      state.flow.selectedTime = null;
      state.async.availableSlots = [];
      state.async.slotsReason = undefined;
      if (action.payload) {
        state.flow.currentStep = 'service';
      }
    },
    setSelectedService: (state, action: PayloadAction<Service | null>) => {
      state.flow.selectedService = action.payload;
      if (action.payload) {
        state.flow.currentStep = 'datetime';
      }
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      if (state.flow.selectedDate === action.payload) return;
      state.flow.selectedDate = action.payload;
      state.flow.selectedTime = null;
      state.async.availableSlots = [];
      state.async.slotsReason = undefined;
    },
    setSelectedTime: (state, action: PayloadAction<string | null>) => {
      state.flow.selectedTime = action.payload;
    },
    setPaymentMethod: (state, action: PayloadAction<PaymentMethod>) => {
      state.flow.paymentMethod = action.payload;
    },
    setClientData: (
      state,
      action: PayloadAction<{
        name: string;
        lastname: string;
        phone: string;
        email: string;
      }>
    ) => {
      state.flow.clientName = action.payload.name;
      state.flow.clientLastname = action.payload.lastname;
      state.flow.clientPhone = action.payload.phone;
      state.flow.clientEmail = action.payload.email;
    },
    clearBookingError: (state) => {
      state.async.barbersError = null;
      state.async.servicesError = null;
      state.async.slotsError = null;
      state.async.confirmError = null;
    },
    resetBooking: () => initialState,
    resetBookingFlow: (state) => {
      state.flow = initialState.flow;
      state.async.submitSuccess = false;
      state.async.createdAppointment = null;
      state.async.isConfirming = false;
      state.async.confirmError = null;
      state.async.preferenceId = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPublicBarbers.pending, (state) => {
        state.async.isLoadingBarbers = true;
        state.async.barbersError = null;
      })
      .addCase(fetchPublicBarbers.fulfilled, (state, action) => {
        state.async.isLoadingBarbers = false;
        state.async.barbers = action.payload;
      })
      .addCase(fetchPublicBarbers.rejected, (state, action) => {
        state.async.isLoadingBarbers = false;
        state.async.barbersError = action.payload as string;
      })
      .addCase(fetchAvailableSlots.pending, (state) => {
        state.async.isLoadingSlots = true;
        state.async.slotsError = null;
      })
      .addCase(fetchAvailableSlots.fulfilled, (state, action) => {
        state.async.isLoadingSlots = false;
        state.async.availableSlots = action.payload.slots;
        state.async.slotsReason = action.payload.reason;
      })
      .addCase(fetchAvailableSlots.rejected, (state, action) => {
        state.async.isLoadingSlots = false;
        state.async.slotsError = action.payload as string;
        state.async.slotsReason = undefined;
      })
      .addCase(submitAppointment.pending, (state) => {
        state.async.isConfirming = true;
        state.async.confirmError = null;
      })
      .addCase(submitAppointment.fulfilled, (state, action) => {
        state.async.isConfirming = false;
        state.async.submitSuccess = true;
        if (action.payload && 'preferenceId' in action.payload) {
          const payload = action.payload as Appointment & { preferenceId: string };
          state.async.createdAppointment = payload;
          state.async.preferenceId = payload.preferenceId;
        } else {
          state.async.createdAppointment = action.payload as Appointment;
        }
      })
      .addCase(submitAppointment.rejected, (state, action) => {
        state.async.isConfirming = false;
        state.async.confirmError = action.payload as string;
      });
  },
});

export const {
  setServices,
  setCurrentStep,
  setSelectedBarber,
  setSelectedService,
  setSelectedDate,
  setSelectedTime,
  setPaymentMethod,
  setClientData,
  clearBookingError,
  resetBooking,
  resetBookingFlow,
} = bookingSlice.actions;

export default bookingSlice.reducer;
