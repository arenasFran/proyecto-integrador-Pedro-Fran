import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { getAccessToken } from '../services/api';
import { getTokenKind, isTokenValid } from '../utils/token';
import { canAccessAdminPath, getStaffHome } from '../utils/rbac';
import { Spinner } from './common';

export function RequireAdminRoute({ children }: { children: React.ReactNode }) {
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const location = useLocation();
  const token = getAccessToken();
  const role = getTokenKind(token);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isTokenValid(token) || (role !== 'Admin' && role !== 'Empleado')) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminPath(role, location.pathname)) {
    return <Navigate to={getStaffHome(role)} replace />;
  }

  return <>{children}</>;
}

export function RequireClientRoute({ children }: { children: React.ReactNode }) {
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const token = getAccessToken();
  const role = getTokenKind(token);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isTokenValid(token)) {
    if (role === 'Admin' || role === 'Empleado') {
      return <Navigate to={getStaffHome(role)} replace />;
    }

    if (role === 'Registrado') {
      return <>{children}</>;
    }
  }

  return <Navigate to="/" replace />;
}
