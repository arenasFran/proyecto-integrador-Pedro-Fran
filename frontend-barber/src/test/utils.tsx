import React, { type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/common';
import authReducer from '../store/slices/authSlice';
import barbersReducer from '../store/slices/barbersSlice';
import { authApi } from '../services/authApi';
import { paymentApi } from '../services/paymentApi';
import type { RootState } from '../store';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: Partial<RootState>;
  initialEntries?: string[];
}

function createTestStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: {
      auth: authReducer,
      barbers: barbersReducer,
      [authApi.reducerPath]: authApi.reducer,
      [paymentApi.reducerPath]: paymentApi.reducer,
    } as any,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(authApi.middleware, paymentApi.middleware),
    preloadedState,
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  { preloadedState, initialEntries, ...renderOptions }: ExtendedRenderOptions = {}
) {
  const store = createTestStore(preloadedState);

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>
          <ToastProvider>{children}</ToastProvider>
        </MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
