import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { useAppDispatch } from '../store/hooks';
import { getAccessToken, silentRefresh } from '../services/api';
import { getTokenKind, isTokenValid } from '../utils/token';
import { canAccessAdminPath, getStaffHome } from '../utils/rbac';
import { logout } from '../store/slices/authSlice';
import { Spinner } from './common';

export function SessionExpiredRedirect({ to }: { to: string }) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const [status, setStatus] = useState<'recovering' | 'recovered' | 'redirect'>('recovering');

  useEffect(() => {
    let cancelled = false;

    void silentRefresh().then((refreshed) => {
      if (cancelled) return;

      if (refreshed) {
        setStatus('recovered');
        return;
      }

      dispatch(logout());
      setStatus('redirect');
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  if (status === 'recovering') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center" aria-busy="true">
        <Spinner size="lg" />
      </div>
    );
  }

  const destination = status === 'recovered'
    ? `${location.pathname}${location.search}${location.hash}`
    : to;
  return <Navigate to={destination} replace />;
}

export function RequireAdminRoute({ children }: { children: React.ReactNode }) {
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const loginToken = useAppSelector((state) => state.auth.loginToken);
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

  if (!token && !loginToken) {
    return <Navigate to="/login" replace />;
  }

  if (!isTokenValid(token)) {
    return <SessionExpiredRedirect to="/login" />;
  }

  if (role !== 'Admin' && role !== 'Empleado') {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminPath(role, location.pathname)) {
    return <Navigate to={getStaffHome(role)} replace />;
  }

  return <>{children}</>;
}

export function RequireClientRoute({ children }: { children: React.ReactNode }) {
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);
  const loginToken = useAppSelector((state) => state.auth.loginToken);
  const token = getAccessToken();
  const role = getTokenKind(token);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!token && !loginToken) {
    return <Navigate to="/login" replace />;
  }

  if (!isTokenValid(token)) {
    return <SessionExpiredRedirect to="/" />;
  }

  if (role === 'Admin' || role === 'Empleado') {
    return <Navigate to={getStaffHome(role)} replace />;
  }

  if (role === 'Registrado') {
    return <>{children}</>;
  }

  return <Navigate to="/" replace />;
}
