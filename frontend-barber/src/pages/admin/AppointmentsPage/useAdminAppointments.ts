import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetAppointmentsPaginatedQuery } from '../../../services/appointmentApi';
import { useAppointmentActions } from './useAppointmentActions';

export function useAdminAppointments() {
  const actions = useAppointmentActions();

  const [searchParams, setSearchParams] = useSearchParams();

  const filterDateFrom = searchParams.get('dateFrom') ?? '';
  const filterDateTo = searchParams.get('dateTo') ?? '';
  const filterBarberId = searchParams.get('barberId') ?? '';
  const filterStatus = searchParams.get('status') ?? '';
  const filterPaymentMethod = searchParams.get('paymentMethod') ?? '';
  const searchTerm = searchParams.get('search') ?? '';
  const page = Number(searchParams.get('page') ?? '1');
  const sortBy = (searchParams.get('sortBy') as 'date' | 'time' | null) ?? null;
  const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc') ?? 'asc';

  const updateParams = useCallback((updates: Record<string, string | undefined>, resetPage = true) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (resetPage) next.delete('page');
      return next;
    });
  }, [setSearchParams]);

  const [pageSize, setPageSize] = useState(15);
  const [showCustomize, setShowCustomize] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleSort = useCallback((column: 'date' | 'time') => {
    if (sortBy === column) {
      updateParams({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' }, false);
    } else {
      updateParams({ sortBy: column, sortDir: 'asc' }, false);
    }
  }, [sortBy, sortDir, updateParams]);

  const handleDateRangeChange = useCallback((desde: string, hasta: string) => {
    updateParams({ dateFrom: desde, dateTo: hasta });
  }, [updateParams]);

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const queryParams = useMemo(() => {
    const params: Record<string, string | number | undefined> = {};
    if (filterDateFrom) params.dateFrom = filterDateFrom;
    if (filterDateTo) params.dateTo = filterDateTo;
    if (filterBarberId) params.barberId = filterBarberId;
    if (filterStatus) params.status = filterStatus;
    if (filterPaymentMethod) params.paymentMethod = filterPaymentMethod;
    if (searchTerm.trim()) params.searchTerm = searchTerm.trim();
    params.includeBarber = 'true';
    params.includeClient = 'true';
    params.page = page;
    params.limit = pageSize;
    if (sortBy) {
      params.sortBy = sortBy;
      params.sortDir = sortDir;
    }
    return params;
  }, [filterDateFrom, filterDateTo, filterBarberId, filterStatus, filterPaymentMethod, searchTerm, page, pageSize, sortBy, sortDir]);

  const { data: paginatedData, isLoading } = useGetAppointmentsPaginatedQuery(queryParams, { pollingInterval: 30000 });
  const appointments = useMemo(() => paginatedData?.appointments ?? [], [paginatedData]);
  const totalResults = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const stats = useMemo(() => {
    const total = totalResults;
    const confirmed = appointments.filter((a) => a.status === 'Confirmado').length;
    const completed = appointments.filter((a) => a.status === 'Completado').length;
    const cancelled = appointments.filter((a) => a.status === 'Cancelado').length;
    return { total, confirmed, completed, cancelled };
  }, [appointments, totalResults]);

  return {
    ...actions,
    // State
    appointments, totalResults, totalPages, isLoading,
    searchParams, filterDateFrom, filterDateTo, filterBarberId,
    filterStatus, filterPaymentMethod, searchTerm, page, sortBy, sortDir,
    pageSize, showCustomize, expandedId,
    stats,
    // Setters
    setPageSize, setShowCustomize, setExpandedId,
    // Actions
    toggleSort, handleDateRangeChange, clearFilters, updateParams,
  };
}
