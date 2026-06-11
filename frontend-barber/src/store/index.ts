import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import barbersReducer from './slices/barbersSlice';
import bookingReducer from './slices/bookingSlice';
import { appointmentApi } from '../services/appointmentApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    barbers: barbersReducer,
    booking: bookingReducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(appointmentApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
