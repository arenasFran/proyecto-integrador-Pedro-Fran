import { describe, expect, it, beforeEach, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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

  it('muestra el banner la primera vez y guarda consentimiento al aceptar todas', () => {
    vi.useFakeTimers();

    try {
      renderWithProviders(<CookieConsent />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /política de cookies/i })).toHaveAttribute('href', '/cookies');

      fireEvent.click(screen.getByRole('button', { name: /aceptar todas/i }));

      const stored = getStoredConsent();
      expect(stored).not.toBeNull();
      expect(stored?.essential).toBe(true);
      expect(stored?.analytics).toBe(true);
      expect(stored?.marketing).toBe(true);
      expect(stored?.cookiesVersion).toBe('1.0');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('guarda "solo necesarias" al elegir esa opción', async () => {
    vi.useFakeTimers();

    try {
      renderWithProviders(<CookieConsent />);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      fireEvent.click(screen.getByRole('button', { name: /solo necesarias/i }));

      const stored = getStoredConsent();
      expect(stored?.analytics).toBe(false);
      expect(stored?.marketing).toBe(false);
      expect(stored?.essential).toBe(true);
      expect(stored?.cookiesVersion).toBe('1.0');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('se puede reabrir desde las preferencias de cookies', async () => {
    localStorage.setItem('cookieConsent', JSON.stringify(storedConsent));
    renderWithProviders(<CookieConsent />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      openCookiePreferences();
    });
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});
