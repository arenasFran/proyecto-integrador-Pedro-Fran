import { describe, expect, it, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CookieConsent } from './CookieConsent';
import { getStoredConsent, openCookiePreferences } from '../../utils/cookieConsent';
import { renderWithProviders } from '../../test/utils';

const storedConsent = {
  essential: true,
  analytics: true,
  marketing: true,
  cookiesVersion: '1.0',
  acceptedAt: new Date().toISOString(),
};

describe('CookieConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('no muestra el banner si ya existe consentimiento guardado', () => {
    localStorage.setItem('cookieConsent', JSON.stringify(storedConsent));
    renderWithProviders(<CookieConsent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el banner la primera vez y guarda consentimiento al aceptar todas', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookieConsent />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /política de cookies/i })).toHaveAttribute('href', '/cookies');

    await user.click(screen.getByRole('button', { name: /aceptar todas/i }));

    const stored = getStoredConsent();
    expect(stored).not.toBeNull();
    expect(stored?.essential).toBe(true);
    expect(stored?.analytics).toBe(true);
    expect(stored?.marketing).toBe(true);
    expect(stored?.cookiesVersion).toBe('1.0');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('guarda "solo necesarias" al elegir esa opción', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CookieConsent />);

    await user.click(screen.getByRole('button', { name: /solo necesarias/i }));

    const stored = getStoredConsent();
    expect(stored?.analytics).toBe(false);
    expect(stored?.marketing).toBe(false);
    expect(stored?.essential).toBe(true);
    expect(stored?.cookiesVersion).toBe('1.0');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('se puede reabrir desde las preferencias de cookies', async () => {
    localStorage.setItem('cookieConsent', JSON.stringify(storedConsent));
    renderWithProviders(<CookieConsent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    openCookiePreferences();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});
