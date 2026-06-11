import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { professionalService } from '../../services/professional.service';
import { serviceService } from '../../services/service.service';
import { appointmentService } from '../../services/appointment.service';
import type {
  BarberPublic,
  Service,
  Appointment,
  BookingStep,
  CreateAppointmentPayload,
} from '../../types/booking';

interface BookingAsyncState {
  barbers: BarberPublic[];
  services: Service[];
  availableSlots: string[];
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

export const fetchServices = createAsyncThunk(
  'booking/fetchServices',
  async (_, { rejectWithValue }) => {
    try {
      return await serviceService.list();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar servicios';
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
      const response = await professionalService.getSlots(barberId, date);
      return response.slots;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar horarios';
      return rejectWithValue(message);
    }
  }
);

export const submitAppointment = createAsyncThunk(
  'booking/submitAppointment',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { flow } = (getState() as { booking: BookingState }).booking;
      const payload: CreateAppointmentPayload = {
        barberId: flow.selectedBarber!.id,
        serviceId: flow.selectedService!.id,
        date: flow.selectedDate!,
        startTime: flow.selectedTime!,
        clientName: flow.clientName,
        clientLastname: flow.clientLastname,
        clientPhone: flow.clientPhone,
        clientEmail: flow.clientEmail,
      };
      const response = await appointmentService.create(payload);
      return response.appointment;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear la reserva';
      return rejectWithValue(message);
    }
  }
);

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setCurrentStep: (state, action: PayloadAction<BookingStep>) => {
      state.flow.currentStep = action.payload;
    },
    setSelectedBarber: (state, action: PayloadAction<BarberPublic | null>) => {
      state.flow.selectedBarber = action.payload;
      state.flow.selectedDate = null;
      state.flow.selectedTime = null;
      state.async.availableSlots = [];
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
      state.flow.selectedDate = action.payload;
      state.flow.selectedTime = null;
      state.async.availableSlots = [];
    },
    setSelectedTime: (state, action: PayloadAction<string | null>) => {
      state.flow.selectedTime = action.payload;
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
      .addCase(fetchServices.pending, (state) => {
        state.async.isLoadingServices = true;
        state.async.servicesError = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.async.isLoadingServices = false;
        state.async.services = action.payload;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.async.isLoadingServices = false;
        state.async.servicesError = action.payload as string;
      })
      .addCase(fetchAvailableSlots.pending, (state) => {
        state.async.isLoadingSlots = true;
        state.async.slotsError = null;
      })
      .addCase(fetchAvailableSlots.fulfilled, (state, action) => {
        state.async.isLoadingSlots = false;
        state.async.availableSlots = action.payload;
      })
      .addCase(fetchAvailableSlots.rejected, (state, action) => {
        state.async.isLoadingSlots = false;
        state.async.slotsError = action.payload as string;
      })
      .addCase(submitAppointment.pending, (state) => {
        state.async.isConfirming = true;
        state.async.confirmError = null;
      })
      .addCase(submitAppointment.fulfilled, (state, action) => {
        state.async.isConfirming = false;
        state.async.submitSuccess = true;
        state.async.createdAppointment = action.payload;
      })
      .addCase(submitAppointment.rejected, (state, action) => {
        state.async.isConfirming = false;
        state.async.confirmError = action.payload as string;
      });
  },
});

export const {
  setCurrentStep,
  setSelectedBarber,
  setSelectedService,
  setSelectedDate,
  setSelectedTime,
  setClientData,
  clearBookingError,
  resetBooking,
  resetBookingFlow,
} = bookingSlice.actions;

export default bookingSlice.reducer;
