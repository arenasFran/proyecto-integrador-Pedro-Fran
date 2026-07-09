import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchBarbers } from '../../../store/slices/barbersSlice';
import {
  useCancelAppointmentMutation,
  useChangeBarberMutation,
  useMarkAsPaidMutation,
  useRescheduleAppointmentMutation,
  useSendReminderMutation,
  useUpdateAppointmentStatusMutation,
} from '../../../services/appointmentApi';
import { useToast } from '../../../components/common';
import { useAvailableSlots } from '../../../hooks/useAvailableSlots';
import { getTodayDateString } from '../../../utils/formatDate';
import { extractError } from './helpers';
import type { Appointment } from '../../../types/booking';
import type { QuickCreateInitialClient } from '../CalendarPage/QuickCreateModal';

// Estado y mutaciones para operar un turno (completar, cancelar, reprogramar, etc.).
// Deliberadamente no incluye listado/filtros/paginación: eso es específico de
// cada pantalla que lo consume (ver useAdminAppointments para /admin/turnos).
export function useAppointmentActions() {
  const dispatch = useAppDispatch();
  const barbers = useAppSelector((state) => state.barbers.list);
  const { showToast } = useToast();

  useEffect(() => {
    if (barbers.length === 0) {
      dispatch(fetchBarbers());
    }
  }, [dispatch, barbers.length]);

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBarberId, setRescheduleBarberId] = useState('');
  const { slots: rescheduleSlots, isLoading: isLoadingSlots, error: slotsError } = useAvailableSlots(
    rescheduleBarberId,
    rescheduleDate,
    !!rescheduleTarget
  );

  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'NoShow' } | null>(null);
  const [detailTarget, setDetailTarget] = useState<Appointment | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateDate, setQuickCreateDate] = useState('');
  const [quickCreateClient, setQuickCreateClient] = useState<QuickCreateInitialClient | null>(null);
  const [changeBarberTarget, setChangeBarberTarget] = useState<Appointment | null>(null);
  const [changeBarberNewId, setChangeBarberNewId] = useState('');
  const [combinedActionTarget, setCombinedActionTarget] = useState<{
    appointment: Appointment;
    primaryAction: 'Completado' | 'Pagado';
  } | null>(null);

  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();
  const [rescheduleAppointment, { isLoading: isRescheduling }] = useRescheduleAppointmentMutation();
  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkAsPaidMutation();
  const [sendReminder, { isLoading: isSendingReminder }] = useSendReminderMutation();
  const [changeBarber, { isLoading: isChangingBarber }] = useChangeBarberMutation();

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

  const handleRescheduleDateChange = useCallback((date: string) => {
    setRescheduleDate(date);
    setRescheduleTime('');
  }, []);

  const handleRescheduleBarberChange = useCallback((barberId: string) => {
    setRescheduleBarberId(barberId);
    setRescheduleTime('');
  }, []);

  const handleRescheduleClose = useCallback(() => {
    setRescheduleTarget(null);
  }, []);

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
    setQuickCreateClient(null);
    setShowQuickCreate(true);
  }, []);

  const handleCreateForClient = useCallback((appointment: Appointment) => {
    if (!appointment.clientId) return;
    setDetailTarget(null);
    setQuickCreateDate(getTodayDateString());
    setQuickCreateClient({
      id: appointment.clientId,
      name: appointment.clientName,
      lastname: appointment.clientLastname,
      phone: appointment.clientPhone,
      email: appointment.clientEmail,
    });
    setShowQuickCreate(true);
  }, []);

  const handleQuickCreateClose = useCallback(() => {
    setShowQuickCreate(false);
    setQuickCreateClient(null);
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
    barbers,
    cancelTarget, cancelReason, rescheduleTarget, rescheduleDate, rescheduleTime, rescheduleBarberId,
    rescheduleSlots, isLoadingSlots, slotsError,
    confirmTarget, detailTarget, showQuickCreate, quickCreateDate, quickCreateClient,
    changeBarberTarget, changeBarberNewId, combinedActionTarget,
    isCancelling, isUpdatingStatus, isRescheduling, isMarkingPaid, isSendingReminder, isChangingBarber,
    setCancelTarget, setCancelReason, setRescheduleTarget,
    setRescheduleDate, setRescheduleTime, setRescheduleBarberId,
    setConfirmTarget, setDetailTarget, setShowQuickCreate,
    setQuickCreateDate, setChangeBarberTarget, setChangeBarberNewId, setCombinedActionTarget,
    handleCancelConfirm, handleStatusChange, handleRescheduleConfirm,
    handleRescheduleDateChange, handleRescheduleBarberChange, handleRescheduleClose,
    handleSendReminder, handleDuplicate, handleCreateForClient, handleQuickCreateClose, handleChangeBarberConfirm,
    handleCompleteOnly, handleCompleteAndPaid, handleMarkPaidOnly,
  };
}

export type AppointmentActions = ReturnType<typeof useAppointmentActions>;
