import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import { getStoredConsent, saveConsent, subscribeCookiePreferencesOpen } from '../../utils/cookieConsent';
import { legalConfig } from '../../constants/legal';

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => !getStoredConsent());

  useEffect(() => {
    return subscribeCookiePreferencesOpen(() => setVisible(true));
  }, []);

  const choose = (analytics: boolean, marketing: boolean) => {
    saveConsent({
      essential: true,
      analytics,
      marketing,
      cookiesVersion: legalConfig.cookiesVersion,
      acceptedAt: new Date().toISOString(),
    });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimiento de cookies"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl rounded-[16px] border border-[#282828] bg-[#121212] p-5 shadow-2xl sm:bottom-6 sm:left-6 sm:right-6"
    >
      <button
        type="button"
        aria-label="Cerrar sin aceptar"
        onClick={() => choose(false, false)}
        className="absolute top-3 right-3 text-[#8A8A8A] hover:text-white transition-colors"
      >
        <FiX size={18} />
      </button>

      <p className="pr-8 text-[13px] leading-relaxed text-[#C9C9C9]">
        Usamos cookies necesarias para el funcionamiento de la plataforma y, si
        lo aceptás, cookies de análisis y publicidad para mejorar tu experiencia.
        Podés ver más en nuestra{' '}
        <Link to="/cookies" className="text-[#FF5C00] hover:underline">
          Política de Cookies
        </Link>
        .
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={() => choose(false, false)}
          className="rounded-[10px] border border-[#282828] px-4 py-2 text-[13px] font-medium text-white/85 transition-colors hover:border-[#555]"
        >
          Solo necesarias
        </button>
        <button
          type="button"
          onClick={() => choose(true, true)}
          className="rounded-[10px] bg-[#FF5C00] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#FF5C00]/90"
        >
          Aceptar todas
        </button>
      </div>
    </div>
  );
};
