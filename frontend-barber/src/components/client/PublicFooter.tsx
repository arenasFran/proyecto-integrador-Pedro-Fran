import React from 'react';
import { FiScissors } from 'react-icons/fi';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="border-t border-[#282828] bg-[#050505]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <FiScissors className="text-[#FF5C00]" />
            Barbería SA
          </div>
          <p className="text-[12px] text-[#8A8A8A]">
            &copy; {new Date().getFullYear()} Barbería SA. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
