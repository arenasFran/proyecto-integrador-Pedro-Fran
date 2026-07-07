import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchBarbers } from '../../../store/slices/barbersSlice';
import {
  useCancelAppointmentMutation,
  useChangeBarberMutation,
  useGetAppointmentsPaginatedQuery,
  useMarkAsPaidMutation,
  useRescheduleAppointmentMutation,
  useSendReminderMutation,
  useUpdateAppointmentStatusMutation,
} from '../../../services/appointmentApi';
import { useToast } from '../../../components/common';
import { extractError } from './helpers';
import type { Appointment } from '../../../types/booking';

export function useAdminAppointments() {
  const dispatch = useAppDispatch();
  const barbers = useAppSelector((state) => state.barbers.list);
  const { showToast } = useToast();

  useEffect(() => {
    if (barbers.length === 0) {
      dispatch(fetchBarbers());
    }
  }, [dispatch, barbers.length]);

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
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; right: number } | null>(null);

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBarberId, setRescheduleBarberId] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'NoShow' } | null>(null);
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState('');
  const [changeBarberTarget, setChangeBarberTarget] = useState<Appointment | null>(null);
  const [changeBarberNewId, setChangeBarberNewId] = useState('');
  const [combinedActionTarget, setCombinedActionTarget] = useState<{
    appointment: Appointment;
    primaryAction: 'Completado' | 'Pagado';
  } | null>(null);

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

  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();
  const [rescheduleAppointment, { isLoading: isRescheduling }] = useRescheduleAppointmentMutation();
  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkAsPaidMutation();
  const [sendReminder, { isLoading: isSendingReminder }] = useSendReminderMutation();
  const [changeBarber, { isLoading: isChangingBarber }] = useChangeBarberMutation();

  const stats = useMemo(() => {
    const total = totalResults;
    const confirmed = appointments.filter((a) => a.status === 'Confirmado').length;
    const completed = appointments.filter((a) => a.status === 'Completado').length;
    const cancelled = appointments.filter((a) => a.status === 'Cancelado').length;
    return { total, confirmed, completed, cancelled };
  }, [appointments, totalResults]);

  const handleCancelConfirm = useCallback(async () => {
    if (!cancelTarget) return;
    try {
      await cancelAppointment({ id: cancelTarget.id, reason: cancelReason || undefined }).unwrap();
      showToast('Turno cancelado con éxito');
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  }, [cancelTarget, cancelReason, cancelAppointment, showToast]);

  const handleStatusChange = useCallback(async (id: string, status: 'Completado' | 'NoShow') => {
    try {
      await updateStatus({ id, status }).unwrap();
      showToast(`Turno ${status === 'Completado' ? 'completado' : 'marcado como no asistió'} con éxito`);
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  }, [updateStatus, showToast]);

  const handleRescheduleConfirm = useCallback(async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime || !rescheduleBarberId) return;
    try {
      await rescheduleAppointment({
        id: rescheduleTarget.id,
        date: rescheduleDate,
        startTime: rescheduleTime,
        barberId: rescheduleBarberId,
      }).unwrap();
      showToast('Turno reprogramado con éxito');
      setRescheduleTarget(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleBarberId('');
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  }, [rescheduleTarget, rescheduleDate, rescheduleTime, rescheduleBarberId, rescheduleAppointment, showToast]);

  const handleSendReminder = useCallback(async (id: string) => {
    try {
      await sendReminder({ id }).unwrap();
      showToast('Recordatorio enviado con éxito');
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  }, [sendReminder, showToast]);

  const handleDuplicate = useCallback((appointment: Appointment) => {
    setDetailTarget(null);
    setQuickCreateDate(appointment.date);
    setShowQuickCreate(true);
  }, []);

  const handleChangeBarberConfirm = useCallback(async () => {
    if (!changeBarberTarget || !changeBarberNewId) return;
    try {
      await changeBarber({ id: changeBarberTarget.id, barberId: changeBarberNewId }).unwrap();
      showToast('Barbero cambiado con éxito');
      setChangeBarberTarget(null);
      setChangeBarberNewId('');
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  }, [changeBarberTarget, changeBarberNewId, changeBarber, showToast]);

  const handleCompleteOnly = useCallback(async (id: string) => {
    await handleStatusChange(id, 'Completado');
    setCombinedActionTarget(null);
  }, [handleStatusChange]);

  const handleCompleteAndPaid = useCallback(async (id: string) => {
    await handleStatusChange(id, 'Completado');
    await markAsPaid({ id }).unwrap();
    showToast('Turno completado y pago registrado');
    setCombinedActionTarget(null);
  }, [handleStatusChange, markAsPaid, showToast]);

  const handleMarkPaidOnly = useCallback(async (id: string) => {
    await markAsPaid({ id }).unwrap();
    showToast('Pago registrado con éxito');
    setCombinedActionTarget(null);
  }, [markAsPaid, showToast]);

  return {
    // State
    barbers, appointments, totalResults, totalPages, isLoading,
    searchParams, filterDateFrom, filterDateTo, filterBarberId,
    filterStatus, filterPaymentMethod, searchTerm, page, sortBy, sortDir,
    pageSize, showCustomize, activeMenu, menuRect,
    cancelTarget, cancelReason, rescheduleTarget, rescheduleDate, rescheduleTime, rescheduleBarberId,
    expandedId, confirmTarget, detailTarget, showQuickCreate, quickCreateDate,
    changeBarberTarget, changeBarberNewId, combinedActionTarget,
    isCancelling, isUpdatingStatus, isRescheduling, isMarkingPaid, isSendingReminder, isChangingBarber,
    stats,
    // Setters
    setPageSize, setShowCustomize, setActiveMenu, setMenuRect,
    setCancelTarget, setCancelReason, setRescheduleTarget,
    setRescheduleDate, setRescheduleTime, setRescheduleBarberId,
    setExpandedId, setConfirmTarget, setDetailTarget, setShowQuickCreate,
    setQuickCreateDate, setChangeBarberTarget, setChangeBarberNewId, setCombinedActionTarget,
    // Actions
    toggleSort, handleDateRangeChange, clearFilters, updateParams,
    handleCancelConfirm, handleStatusChange, handleRescheduleConfirm,
    handleSendReminder, handleDuplicate, handleChangeBarberConfirm,
    handleCompleteOnly, handleCompleteAndPaid, handleMarkPaidOnly,
  };
}
