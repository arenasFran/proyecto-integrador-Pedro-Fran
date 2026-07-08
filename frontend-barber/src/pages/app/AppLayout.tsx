import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../../components/sidebar/AppSidebar';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050505]">
      <AppSidebar />

      <div className="lg:ml-60">
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
