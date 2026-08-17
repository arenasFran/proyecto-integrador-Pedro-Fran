import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import { AppSidebar } from '../../components/sidebar/AppSidebar';

export const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505]">
      <AppSidebar
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen(!mobileOpen)}
      />

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-xl border border-[#282828] bg-[#121212] text-[#8A8A8A] transition-colors hover:border-[#FF5C00]/30 hover:text-white lg:hidden"
        aria-label="Abrir menú"
      >
        <FiMenu size={20} />
      </button>

      <div className="lg:ml-52">
        <main className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
