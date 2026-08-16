export type CookieConsent = {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  cookiesVersion: string;
  acceptedAt: string;
};

const CONSENT_KEY = 'cookieConsent';
const OPEN_EVENT = 'cookie-consent:open';

export function getStoredConsent(): CookieConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CookieConsent;
  } catch {
    return null;
  }
}

export function saveConsent(consent: CookieConsent): void {
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
}

export function openCookiePreferences(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function subscribeCookiePreferencesOpen(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
