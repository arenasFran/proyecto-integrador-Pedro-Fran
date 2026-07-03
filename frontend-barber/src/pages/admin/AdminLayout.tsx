import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../../components/common';
import { AppSidebar } from '../../components/sidebar/AppSidebar';
import { QuickCreateModal } from './CalendarPage/QuickCreateModal';
import { getAccessToken } from '../../services/api';
import { getTokenKind } from '../../utils/token';

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const token = getAccessToken();
  const kind = getTokenKind(token);

  return (
    <div className="min-h-screen bg-[#050505] overflow-x-hidden">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onCloseMobile={() => setSidebarOpen(false)}
        mobileOpen={sidebarOpen}
        kind={kind}
      />

      <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <AppHeader onToggleSidebar={() => setSidebarOpen(true)} onQuickCreate={() => setShowQuickCreate(true)} />
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
