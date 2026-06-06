import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import barbersReducer from './slices/barbersSlice';
import bookingReducer from './slices/bookingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    barbers: barbersReducer,
    booking: bookingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;