import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicHeader } from '../../components/client/PublicHeader';
import { PublicFooter } from '../../components/client/PublicFooter';

export const ClientLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <PublicHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

export default ClientLayout;
