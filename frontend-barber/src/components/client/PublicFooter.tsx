import React from 'react';
import { Link } from 'react-router-dom';
import { openCookiePreferences } from '../../utils/cookieConsent';

const legalLinks = [
  { to: '/terminos', label: 'Términos y Condiciones' },
  { to: '/privacidad', label: 'Política de Privacidad' },
  { to: '/cancelaciones', label: 'Cancelaciones y Reembolsos' },
  { to: '/cookies', label: 'Política de Cookies' },
];

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#282828] bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <img src="/logo-barberia.PNG" alt="Barbería SA" className="h-6 w-auto" />
            Barbería SA
          </div>
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="text-[12px] text-[#8A8A8A] hover:text-[#FF5C00] transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={openCookiePreferences}
                className="text-[12px] text-[#8A8A8A] hover:text-[#FF5C00] transition-colors"
              >
                Preferencias de cookies
              </button>
            </li>
          </ul>
        </div>
        <p className="mt-4 text-center text-[12px] text-[#8A8A8A]">
          &copy; {new Date().getFullYear()} Barbería SA. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};
