import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../../components/sidebar/AppSidebar';
import { QuickCreateModal } from './CalendarPage/QuickCreateModal';

export const AdminLayout: React.FC = () => {
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  return (
    <div className="min-h-screen bg-[#050505] overflow-x-hidden">
      <AppSidebar onQuickCreate={() => setShowQuickCreate(true)} />

      <div className="lg:ml-60">
        <main className="p-4 sm:p-6 lg:p-8">
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
