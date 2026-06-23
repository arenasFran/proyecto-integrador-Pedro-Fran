import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../../components/common';
import { AppSidebar } from '../../components/sidebar/AppSidebar';
import { getAccessToken } from '../../services/api';
import { getTokenKind } from '../../utils/token';

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const token = getAccessToken();
  const kind = getTokenKind(token);

  return (
    <div className="min-h-screen bg-[#050505]">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        onCloseMobile={() => setSidebarOpen(false)}
        mobileOpen={sidebarOpen}
        kind={kind}
      />

      <div className={`transition-all duration-300 ease-in-out ${collapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <AppHeader onToggleSidebar={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
