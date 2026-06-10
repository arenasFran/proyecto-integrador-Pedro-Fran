import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminHeader } from '../../../components/admin/AdminHeader';

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050505]">
      <AdminHeader />
      <main>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
