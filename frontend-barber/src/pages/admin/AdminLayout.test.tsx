import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '../../test/utils';
import { AdminLayout } from './AdminLayout';

vi.mock('../../utils/token', () => ({
  getTokenUser: vi.fn(() => null),
  getTokenKind: vi.fn(() => 'Admin'),
}));

describe('AdminLayout', () => {
  it('renders AdminHeader', () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<p>child content</p>} />
        </Route>
      </Routes>,
      { initialEntries: ['/admin'] }
    );

    const brandElements = screen.getAllByText('Barbería SA');
    expect(brandElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders child route content via Outlet', () => {
    renderWithProviders(
      <Routes>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<p>child content</p>} />
        </Route>
      </Routes>,
      { initialEntries: ['/admin'] }
    );

    expect(screen.getByText('child content')).toBeInTheDocument();
  });
});
