import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import barbersReducer from './slices/barbersSlice';
import bookingReducer from './slices/bookingSlice';
import cartReducer from './slices/cartSlice';
import { analyticsApi } from '../services/analyticsApi';
import { appointmentApi } from '../services/appointmentApi';
import { authApi } from '../services/authApi';
import { membershipApi } from '../services/membershipApi';
import { serviceApi } from '../services/service.api';
import { productApi } from '../services/productApi';
import { orderApi } from '../services/orderApi';
import { paymentApi } from '../services/paymentApi';
import { telegramApi } from '../services/telegramApi';
import { analisisCorteApi } from '../services/analisisCorteApi';
import { clientApi } from '../services/clientApi';
import { cartApi } from '../services/cartApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    barbers: barbersReducer,
    booking: bookingReducer,
    cart: cartReducer,
    [appointmentApi.reducerPath]: appointmentApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [membershipApi.reducerPath]: membershipApi.reducer,
    [serviceApi.reducerPath]: serviceApi.reducer,
    [productApi.reducerPath]: productApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [telegramApi.reducerPath]: telegramApi.reducer,
    [analisisCorteApi.reducerPath]: analisisCorteApi.reducer,
    [clientApi.reducerPath]: clientApi.reducer,
    [cartApi.reducerPath]: cartApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      appointmentApi.middleware,
      authApi.middleware,
      analyticsApi.middleware,
      membershipApi.middleware,
      serviceApi.middleware,
      productApi.middleware,
      orderApi.middleware,
      paymentApi.middleware,
      telegramApi.middleware,
      analisisCorteApi.middleware,
      clientApi.middleware,
      cartApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
