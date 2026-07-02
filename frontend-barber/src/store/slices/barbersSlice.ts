import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { professionalService } from '../../services/professional.service';
import type {
  BarberSchedule,
  Professional,
  ProfessionalPayload,
  ProfessionalUpdatePayload,
} from '../../types/professional';

interface BarbersState {
  list: Professional[];
  isLoading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

const initialState: BarbersState = {
  list: [],
  isLoading: false,
  error: null,
  total: 0,
  page: 1,
  totalPages: 1,
  limit: 50,
};

export const fetchBarbers = createAsyncThunk(
  'barbers/fetchBarbers',
  async (_, { rejectWithValue }) => {
    try {
      return await professionalService.list();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al cargar profesionales';
      return rejectWithValue(message);
    }
  }
);

export const fetchBarbersPaginated = createAsyncThunk(
  'barbers/fetchBarbersPaginated',
  async (params: { page?: number; limit?: number; search?: string }, { rejectWithValue }) => {
    try {
      return await professionalService.listPaginated(params);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al cargar profesionales';
      return rejectWithValue(message);
    }
  }
);

export const createBarber = createAsyncThunk(
  'barbers/createBarber',
  async (payload: ProfessionalPayload, { rejectWithValue }) => {
    try {
      return await professionalService.create(payload);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al crear profesional';
      return rejectWithValue(message);
    }
  }
);

export const updateBarber = createAsyncThunk(
  'barbers/updateBarber',
  async (
    { id, data }: { id: string; data: ProfessionalUpdatePayload },
    { rejectWithValue }
  ) => {
    try {
      return await professionalService.update(id, data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al actualizar profesional';
      return rejectWithValue(message);
    }
  }
);

export const removeBarber = createAsyncThunk(
  'barbers/removeBarber',
  async (id: string, { rejectWithValue }) => {
    try {
      const message = await professionalService.remove(id);
      return { id, message };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al eliminar profesional';
      return rejectWithValue(message);
    }
  }
);

export const deactivateBarber = createAsyncThunk(
  'barbers/deactivateBarber',
  async (id: string, { rejectWithValue }) => {
    try {
      const result = await professionalService.deactivate(id);
      return { id, message: result.message };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al desactivar profesional';
      return rejectWithValue(message);
    }
  }
);

export const activateBarber = createAsyncThunk(
  'barbers/activateBarber',
  async (id: string, { rejectWithValue }) => {
    try {
      const barber = await professionalService.activate(id);
      return barber;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error al activar profesional';
      return rejectWithValue(message);
    }
  }
);

export const updateBarberSchedule = createAsyncThunk(
  'barbers/updateBarberSchedule',
  async (
    { id, schedule }: { id: string; schedule: BarberSchedule },
    { rejectWithValue }
  ) => {
    try {
      const updatedSchedule = await professionalService.updateSchedule(id, schedule);
      return { id, schedule: updatedSchedule };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al actualizar horario';
      return rejectWithValue(message);
    }
  }
);

export const updateBarberMe = createAsyncThunk(
  'barbers/updateBarberMe',
  async (data: {
    name?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    password?: string;
    photoUrl?: string | null;
    services?: string[];
    age?: number | null;
    slotDuration?: number;
    maxAdvanceDays?: number;
    schedule?: BarberSchedule;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put('/api/barbers/me', data);
      const raw = response.data as { id: string; _id?: string; [key: string]: unknown };
      const mapped: Professional = {
        id: raw.id ?? String(raw._id ?? ''),
        name: raw.name as string,
        lastname: raw.lastname as string,
        email: raw.email as string,
        phone: raw.phone as string,
        kind: raw.kind as 'Admin' | 'Empleado',
        services: raw.services as string[],
        age: raw.age as number | undefined,
        photoUrl: raw.photoUrl as string | null | undefined,
        isActive: raw.isActive as boolean,
        slotDuration: raw.slotDuration as number,
        maxAdvanceDays: raw.maxAdvanceDays as number,
        schedule: raw.schedule as BarberSchedule,
      };
      return mapped;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar perfil';
      return rejectWithValue(message);
    }
  }
);

const barbersSlice = createSlice({
  name: 'barbers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBarbers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBarbers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
        state.total = action.payload.length;
        state.totalPages = 1;
        state.page = 1;
      })
      .addCase(fetchBarbers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchBarbersPaginated.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBarbersPaginated.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.barbers;
        state.total = action.payload.total;
        state.page = action.payload.page;
        state.totalPages = action.payload.totalPages;
        state.limit = action.payload.limit;
      })
      .addCase(fetchBarbersPaginated.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createBarber.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(updateBarber.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(removeBarber.fulfilled, (state, action) => {
        state.list = state.list.filter((p) => p.id !== action.payload.id);
      })
      .addCase(deactivateBarber.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = { ...state.list[index], isActive: false };
        }
      })
      .addCase(activateBarber.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      .addCase(updateBarberSchedule.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index].schedule = action.payload.schedule;
        }
      })
      .addCase(updateBarberMe.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      });
  },
});

export default barbersSlice.reducer;
