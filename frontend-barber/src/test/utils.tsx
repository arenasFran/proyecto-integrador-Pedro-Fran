import React, { type PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { configureStore, type PreloadedState } from '@reduxjs/toolkit';
import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import authReducer from '../store/slices/authSlice';
import barbersReducer from '../store/slices/barbersSlice';
import type { RootState } from '../store';


interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
  preloadedState?: PreloadedState<RootState>;
  initialEntries?: string[];
}

function createTestStore(preloadedState?: PreloadedState<RootState>) {
  return configureStore({
    reducer: { auth: authReducer, barbers: barbersReducer } as never,
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
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
} 