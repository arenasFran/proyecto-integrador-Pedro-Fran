import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import barbersReducer from './slices/barbersSlice';
import bookingReducer from './slices/bookingSlice';
import { appointmentApi } from '../services/appointmentApi';
import { authApi } from '../services/authApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    barbers: barbersReducer,
    booking: bookingReducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(appointmentApi.middleware, authApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
