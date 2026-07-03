import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiHome, FiScissors } from 'react-icons/fi';
import { Button } from '../../../components/common';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center justify-between border-b border-[#282828] px-6 py-4">
        <div
          className="flex cursor-pointer items-center gap-2 text-[16px] font-bold text-white"
          onClick={() => navigate('/')}
        >
          <FiScissors className="text-[#FF5C00]" />
          Barbería SA
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-[#FF5C00]/10">
          <span className="text-[36px] font-black text-[#FF5C00]">404</span>
        </div>
        <h1 className="text-[28px] font-extrabold tracking-tight sm:text-[36px]">
          Página no encontrada
        </h1>
        <p className="mt-3 max-w-md text-[14px] text-[#8A8A8A]">
          La página que estás buscando no existe o fue movida. Revisá la URL o volvé al inicio.
        </p>
        <Button className="mt-8" icon={FiHome} onClick={() => navigate('/')}>
          Volver al inicio
        </Button>
      </main>
    </div>
  );
};

export default NotFoundPage;
