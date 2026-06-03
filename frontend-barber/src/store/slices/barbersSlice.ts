import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
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
}

const initialState: BarbersState = {
  list: [],
  isLoading: false,
  error: null,
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

export const updateBarberSchedule = createAsyncThunk(
  'barbers/updateBarberSchedule',
  async (
    { id, schedule }: { id: string; schedule: BarberSchedule },
    { rejectWithValue }
  ) => {
    try {
      return await professionalService.updateSchedule(id, schedule);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al actualizar horario';
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
      })
      .addCase(fetchBarbers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default barbersSlice.reducer;
