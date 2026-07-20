import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import { AppSidebar } from '../../components/sidebar/AppSidebar';
import { QuickCreateModal } from './CalendarPage/QuickCreateModal';

export const AdminLayout: React.FC = () => {
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] overflow-x-hidden">
      <AppSidebar
        onQuickCreate={() => setShowQuickCreate(true)}
        mobileOpen={mobileOpen}
        onToggleMobile={() => setMobileOpen(!mobileOpen)}
      />

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-30 lg:hidden flex items-center justify-center w-10 h-10 rounded-[10px] bg-[#121212] border border-[#282828] text-[#8A8A8A] hover:text-white hover:border-[#FF5C00]/30 transition-colors"
        aria-label="Abrir menú"
      >
        <FiMenu size={20} />
      </button>

      <div className="lg:ml-52">
        <main className="p-4 sm:p-6 lg:p-8 pt-14 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {showQuickCreate && (
        <QuickCreateModal
          dateStr={new Date().toISOString().slice(0, 10)}
          onClose={() => setShowQuickCreate(false)}
        />
      )}
    </div>
  );
};

export default AdminLayout;
