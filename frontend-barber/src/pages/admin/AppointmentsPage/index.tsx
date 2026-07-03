import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiChevronUp,
  FiClock,
  FiDownload,
  FiInfo,
  FiMoreVertical,
  FiScissors,
  FiSettings,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import { AnimatedContainer, Button, ConfirmModal, Input, Pagination, Select, Spinner, StatsCards, useToast, DatePicker } from '../../../components/common';
import DateRangeFilter from '../../../components/common/DateRangeFilter';
import { QuickCreateModal } from '../CalendarPage/QuickCreateModal';
import { formatDate } from '../../../utils/formatDate';
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
import type { Appointment, AppointmentStatus, CreatedBy } from '../../../types/booking';
import { AppointmentDetailModal } from './AppointmentDetailModal';

const statusStyles: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Confirmado' },
  Completado: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completado' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
  NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'No asistió' },
};

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

const methodLabelExport: Record<string, string> = { local: 'Local', online: 'Online', memberPass: 'Membresía' };

function exportCSV(appointments: Appointment[]) {
  const headers = ['Fecha', 'Hora inicio', 'Hora fin', 'Cliente', 'Apellido', 'Email', 'Teléfono', 'Barbero', 'Servicio', 'Duración (min)', 'Precio', 'Estado', 'Estado de pago', 'Método de pago', 'Origen'];
  const rows = appointments.map((a) => [
    a.date,
    a.startTime,
    a.endTime,
    a.clientName,
    a.clientLastname,
    a.clientEmail ?? '',
    a.clientPhone ?? '',
    a.barberName ?? '',
    a.serviceName,
    String(a.serviceDuration),
    String(a.servicePrice),
    a.status,
    a.paymentStatus,
    methodLabelExport[a.paymentMethod] ?? a.paymentMethod,
    a.createdBy?.type === 'staff' ? 'Admin' : a.createdBy?.type === 'registered' ? 'Online' : a.createdBy?.type === 'anonymous' ? 'Invitado' : '',
  ]);
  const bom = '\uFEFF';
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `turnos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const AdminAppointmentsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const barbers = useAppSelector((state) => state.barbers.list);
  const { showToast } = useToast();

  useEffect(() => {
    if (barbers.length === 0) {
      dispatch(fetchBarbers());
    }
  }, [dispatch, barbers.length]);

  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterBarberId, setFilterBarberId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(15);
  const [showCustomize, setShowCustomize] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; right: number } | null>(null);
  const [page, setPage] = useState(1);

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBarberId, setRescheduleBarberId] = useState('');

  const [sortBy, setSortBy] = useState<'date' | 'time' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (column: 'date' | 'time') => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const handleDateRangeChange = (desde: string, hasta: string) => {
    setFilterDateFrom(desde);
    setFilterDateTo(hasta);
  };

  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterBarberId('');
    setFilterStatus('');
    setFilterPaymentMethod('');
    setSearchTerm('');
    setSortBy(null);
    setSortDir('asc');
    setPage(1);
  };

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
  const { data: paginatedData, isLoading, isFetching, error } = useGetAppointmentsPaginatedQuery(queryParams, {
    pollingInterval: 30000,
  });

  const appointments = paginatedData?.appointments ?? [];
  const totalResults = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();
  const [rescheduleAppointment, { isLoading: isRescheduling }] = useRescheduleAppointmentMutation();

  const stats = useMemo(() => {
    const total = totalResults;
    const confirmed = appointments.filter((a) => a.status === 'Confirmado').length;
    const completed = appointments.filter((a) => a.status === 'Completado').length;
    const cancelled = appointments.filter((a) => a.status === 'Cancelado').length;
    return { total, confirmed, completed, cancelled };
  }, [appointments, totalResults]);

  useEffect(() => {
    setPage(1);
  }, [filterDateFrom, filterDateTo, filterBarberId, filterStatus, filterPaymentMethod, pageSize, sortBy, sortDir]);

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

  const [markAsPaid, { isLoading: isMarkingPaid }] = useMarkAsPaidMutation();
  const [sendReminder, { isLoading: isSendingReminder }] = useSendReminderMutation();
  const [changeBarber, { isLoading: isChangingBarber }] = useChangeBarberMutation();

  const handleMarkAsPaid = async (id: string) => {
    try {
      await markAsPaid({ id }).unwrap();
      showToast('Pago registrado con éxito');
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  const handleSendReminder = async (id: string) => {
    try {
      await sendReminder({ id }).unwrap();
      showToast('Recordatorio enviado con éxito');
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  const handleDuplicate = (appointment: Appointment) => {
    setDetailTarget(null);
    setQuickCreateDate(appointment.date);
    setShowQuickCreate(true);
  };

  const handleChangeBarberConfirm = async () => {
    if (!changeBarberTarget || !changeBarberNewId) return;
    try {
      await changeBarber({ id: changeBarberTarget.id, barberId: changeBarberNewId }).unwrap();
      showToast('Barbero cambiado con éxito');
      setChangeBarberTarget(null);
      setChangeBarberNewId('');
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  const formatTimeRange = (start: string, end: string) => {
    const short = (t: string) => { const [h, m] = t.split(':'); return `${h}:${m}`; };
    return `${short(start)} - ${short(end)}`;
  };

  const paymentBadge = (ps: Appointment['paymentStatus']) => {
    const isPaid = ps === 'Pagado';
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isPaid ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
        {isPaid ? 'Pagado' : 'Pendiente'}
      </span>
    );
  };

  const methodLabel: Record<string, string> = { local: 'Local', online: 'Online', memberPass: 'Membresía' };

  const originBadge = (cb?: CreatedBy) => {
    if (!cb) return <span className="text-[11px] text-[#8A8A8A]">—</span>;
    const config: Record<string, { label: string; color: string }> = {
      staff: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400' },
      registered: { label: 'Online', color: 'bg-blue-500/10 text-blue-400' },
      anonymous: { label: 'Invitado', color: 'bg-gray-500/10 text-gray-400' },
    };
    const c = config[cb.type] ?? { label: cb.type, color: 'bg-gray-500/10 text-gray-400' };
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c.color}`}>{c.label}</span>;
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const statusLabel: Record<string, string> = {
    Confirmado: 'Confirmado', Completado: 'Completado', Cancelado: 'Cancelado', NoShow: 'No asistió',
  };

  const extractError = (err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'data' in err) return String((err as { data: unknown }).data);
    return 'Error inesperado';
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      await cancelAppointment({ id: cancelTarget.id, reason: cancelReason || undefined }).unwrap();
      showToast('Turno cancelado con éxito');
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  const handleStatusChange = async (id: string, status: 'Completado' | 'NoShow') => {
    try {
      await updateStatus({ id, status }).unwrap();
      const label = status === 'Completado' ? 'completado' : 'marcado como no asistió';
      showToast(`Turno ${label} con éxito`);
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  const handleRescheduleConfirm = async () => {
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
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FF5C00]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FF5C00]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6 shadow-[0_0_20px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-4 py-2 text-[12px] text-[#8A8A8A]">
                <FiScissors className="text-[#FF5C00]" />
                Gestión de turnos
              </div>
              <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[38px]">
                Administrá todos los turnos desde una sola pantalla.
              </h1>
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#8A8A8A] sm:text-[15px] hidden md:block">
                Visualizá, cancelá, reprogramá y cambiá el estado de los turnos de forma centralizada.
              </p>
            </div>

            
          </div>

          <StatsCards stats={stats} onStatusClick={(s) => { setFilterStatus(s); setPage(1); }} />
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <DateRangeFilter onChange={handleDateRangeChange} defaultPreset="semana" />
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className={`flex items-center gap-1.5 rounded-[10px] border px-3 py-2 text-[12px] transition-colors ${showCustomize ? 'border-[#FF5C00] text-white' : 'border-[#282828] text-[#8A8A8A] hover:border-[#FF5C00]/50 hover:text-white'}`}
              title="Personalizar lista"
            >
              <FiSettings className="text-sm" />
              Personalizar
            </button>
          </div>

          {showCustomize && (
            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[12px] border border-[#282828] bg-[#1A1A1A] px-4 py-3">
              <div className="flex items-center gap-2">
                <label className="text-[12px] text-[#8A8A8A]">Filas por página</label>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="h-[34px] rounded-[8px] border border-[#282828] bg-[#121212] px-2 text-[13px] text-white outline-none focus:border-[#FF5C00]"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="w-full sm:w-[180px]">
              <Select
                label="Barbero"
                value={filterBarberId}
                onChange={setFilterBarberId}
                options={[
                  { value: '', label: 'Todos' },
                  ...barbers.map((b) => ({ value: b.id, label: `${b.name} ${b.lastname}` })),
                ]}
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                label="Estado"
                value={filterStatus}
                onChange={setFilterStatus}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'Confirmado', label: 'Confirmado' },
                  { value: 'Completado', label: 'Completado' },
                  { value: 'Cancelado', label: 'Cancelado' },
                  { value: 'NoShow', label: 'No asistió' },
                ]}
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                label="Método de pago"
                value={filterPaymentMethod}
                onChange={setFilterPaymentMethod}
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'local', label: 'Local' },
                  { value: 'online', label: 'Online' },
                  { value: 'memberPass', label: 'Membresía' },
                ]}
              />
            </div>
            <Input
              label="Buscar"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cliente, email o servicio"
              containerClass="w-full sm:w-[200px]"
            />
            <button
              onClick={() => exportCSV(appointments)}
              className="flex h-[40px] self-end items-center gap-1.5 rounded-[10px] border border-[#282828] px-3 text-[12px] text-[#8A8A8A] hover:text-white hover:border-[#FF5C00]/50 transition-colors"
              title="Exportar a CSV"
            >
              <FiDownload className="text-sm" />
              Exportar CSV
            </button>
            {(filterDateFrom || filterDateTo || filterBarberId || filterStatus || filterPaymentMethod || searchTerm || sortBy) && (
              <button
                onClick={clearFilters}
                className="h-[40px] self-end rounded-[10px] border border-[#282828] px-3 text-[12px] text-[#8A8A8A] hover:text-white hover:border-[#FF5C00]/50 transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
              <FiCalendar className="text-4xl mb-3" />
              <p className="text-[15px]">No se encontraron turnos</p>
              <p className="text-[12px] mt-1">Probá cambiar los filtros o seleccionar otro rango de fechas.</p>
            </div>
          ) : (
            <>
            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {appointments.map((appointment) => {
                const style = statusStyles[appointment.status];
                const isActive = appointment.status === 'Confirmado';
                return (
                  <div key={appointment.id} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-white truncate">
                          {appointment.clientName} {appointment.clientLastname}
                        </p>
                        {appointment.clientEmail && (
                          <p className="text-[11px] text-[#8A8A8A] truncate">{appointment.clientEmail}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {appointment.clientKind && (
                          <span className="text-[10px] text-[#8A8A8A] border border-[#282828] rounded-full px-1.5 py-0.5">{appointment.clientKind === 'Registrado' ? 'Reg.' : 'Anón.'}</span>
                        )}
                        <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        <button
                          onClick={() => setDetailTarget(appointment)}
                          className="text-[#8A8A8A] hover:text-[#FF5C00] transition-colors shrink-0"
                          aria-label="Ver detalle completo"
                          title="Ver detalle completo"
                        >
                          <FiInfo className="text-sm" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Barbero</span>
                        <span className="text-white">{appointment.barberName ?? barbers.find((b) => b.id === appointment.barberId)?.name ?? appointment.barberId.slice(-6)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Servicio</span>
                        <span className="text-white text-right max-w-[60%] truncate">{appointment.serviceName} ({appointment.serviceDuration} min)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Fecha</span>
                        <span className="text-white">{appointment.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Horario</span>
                        <span className="text-white">{formatTimeRange(appointment.startTime, appointment.endTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Pago</span>
                        <span>{paymentBadge(appointment.paymentStatus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A8A8A]">Origen</span>
                        <span>{originBadge(appointment.createdBy)}</span>
                      </div>
                    </div>

                    {appointment.status === 'Cancelado' && (appointment.cancelReason || appointment.cancelledBy) && (
                      <div className="text-[11px] text-[#8A8A8A] leading-relaxed">
                        {appointment.cancelledBy && <span>Cancelado por {appointment.cancelledBy}</span>}
                        {appointment.cancelledAt && <span> el {formatTimestamp(appointment.cancelledAt)}</span>}
                        {appointment.cancelReason && <span> — Motivo: {appointment.cancelReason}</span>}
                      </div>
                    )}

                    {isActive && (
                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-1 border-t border-[#282828]/50">
                        <button
                          onClick={() => { setCombinedActionTarget({ appointment, primaryAction: 'Completado' }); }}
                          className="rounded-[8px] border border-green-500/30 p-1.5 text-green-400 hover:bg-green-500/10 transition-colors"
                          title="Marcar como completado"
                        >
                          <FiCheck className="text-sm" />
                        </button>
                        <button
                          onClick={() => { setRescheduleTarget(appointment); setRescheduleDate(appointment.date); setRescheduleTime(appointment.startTime); setRescheduleBarberId(appointment.barberId); }}
                          className="rounded-[8px] border border-blue-500/30 p-1.5 text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="Reprogramar"
                        >
                          <FiClock className="text-sm" />
                        </button>
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'NoShow')}
                          disabled={isUpdatingStatus}
                          className="rounded-[8px] border border-yellow-500/30 p-1.5 text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                          title="Marcar como no asistió"
                        >
                          <FiXCircle className="text-sm" />
                        </button>
                        <button
                          onClick={() => { setCancelTarget(appointment); setCancelReason(''); }}
                          disabled={isCancelling}
                          className="rounded-[8px] border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="Cancelar turno"
                        >
                          <FiX className="text-sm" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#282828] text-[#8A8A8A] text-[12px] uppercase tracking-wider">
                    <th className="pb-3 pr-2 w-6"></th>
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Barbero</th>
                    <th className="pb-3 pr-4 font-medium">Servicio</th>
                    <th className="pb-3 pr-4 font-medium">
                      <button onClick={() => toggleSort('date')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Fecha
                        {sortBy === 'date' ? (
                          sortDir === 'asc' ? <FiChevronUp className="text-[11px]" /> : <FiChevronDown className="text-[11px]" />
                        ) : (
                          <FiChevronUp className="text-[11px] opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="pb-3 pr-4 font-medium">
                      <button onClick={() => toggleSort('time')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Horario
                        {sortBy === 'time' ? (
                          sortDir === 'asc' ? <FiChevronUp className="text-[11px]" /> : <FiChevronDown className="text-[11px]" />
                        ) : (
                          <FiChevronUp className="text-[11px] opacity-30" />
                        )}
                      </button>
                    </th>
                    <th className="pb-3 pr-4 font-medium">Estado</th>
                    <th className="pb-3 pr-4 font-medium">Pago</th>
                    <th className="pb-3 pr-4 font-medium">Origen</th>
                    <th className="pb-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => {
                    const style = statusStyles[appointment.status];
                    const isActive = appointment.status === 'Confirmado';
                    const isExpanded = expandedId === appointment.id;
                    return (
                      <React.Fragment key={appointment.id}>
                      <tr
                        className={`border-b border-[#282828]/50 transition-colors ${isExpanded ? 'bg-[#1A1A1A]' : 'hover:bg-[#1A1A1A]/80'}`}
                      >
                        <td className="py-3 pr-2">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : appointment.id)}
                              className="text-[#8A8A8A] hover:text-white transition-colors"
                              aria-label={isExpanded ? 'Colapsar detalle' : 'Expandir detalle'}
                            >
                              {isExpanded ? <FiChevronDown className="text-sm" /> : <FiChevronRight className="text-sm" />}
                            </button>
                            <button
                              onClick={() => setDetailTarget(appointment)}
                              className="text-[#8A8A8A] hover:text-[#FF5C00] transition-colors"
                              aria-label="Ver detalle completo"
                              title="Ver detalle completo"
                            >
                              <FiInfo className="text-sm" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium text-white">{appointment.clientName} {appointment.clientLastname}</div>
                          <div className="flex items-center gap-1.5">
                            {appointment.clientEmail && (
                              <span className="text-[11px] text-[#8A8A8A]">{appointment.clientEmail}</span>
                            )}
                            {appointment.clientKind && (
                              <span className="text-[10px] text-[#8A8A8A] border border-[#282828] rounded-full px-1.5">{appointment.clientKind === 'Registrado' ? 'Reg.' : 'Anón.'}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[#8A8A8A]">
                          {appointment.barberName ?? barbers.find((b) => b.id === appointment.barberId)?.name ?? appointment.barberId.slice(-6)}
                        </td>
                        <td className="py-3 pr-4 text-[#8A8A8A]">
                          <span>{appointment.serviceName}</span>
                          <span className="text-[11px] ml-1 text-[#6A6A6A]">({appointment.serviceDuration} min)</span>
                        </td>
                        <td className="py-3 pr-4 text-white whitespace-nowrap">{formatDate(appointment.date)}</td>
                        <td className="py-3 pr-4 text-white whitespace-nowrap">{formatTimeRange(appointment.startTime, appointment.endTime)}</td>
                        <td className="py-3 pr-4">
                          <motion.span
                            key={`${appointment.id}-${appointment.status}`}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}
                          >
                            {style.label}
                          </motion.span>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-1.5">
                            {paymentBadge(appointment.paymentStatus)}
                            <span className="text-[10px] text-[#6A6A6A]">{methodLabel[appointment.paymentMethod] ?? appointment.paymentMethod}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4">{originBadge(appointment.createdBy)}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1.5">
                            {isActive && (
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    if (activeMenu === appointment.id) {
                                      setActiveMenu(null);
                                      setMenuRect(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setMenuRect({ top: rect.top, right: rect.right });
                                      setActiveMenu(appointment.id);
                                    }
                                  }}
                                  className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:bg-[#1A1A1A] transition-colors"
                                  aria-label="Acciones del turno"
                                  aria-expanded={activeMenu === appointment.id}
                                >
                                  <FiMoreVertical className="text-sm" />
                                </button>
                                {activeMenu === appointment.id && menuRect && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => { setActiveMenu(null); setMenuRect(null); }} />
                                    <div
                                      className="fixed z-50 w-48 rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-xl"
                                      style={{
                                        right: window.innerWidth - menuRect.right + 4,
                                        ...(menuRect.top + 200 < window.innerHeight
                                          ? { top: menuRect.top }
                                          : { bottom: window.innerHeight - menuRect.top }),
                                      }}
                                    >
                                        <button
                                          onClick={() => { setCombinedActionTarget({ appointment, primaryAction: 'Completado' }); setActiveMenu(null); setMenuRect(null); }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-green-400 hover:bg-[#242424] transition-colors"
                                          aria-label="Marcar como completado"
                                        >
                                          <FiCheck className="text-sm" /> Completado
                                        </button>
                                        <button
                                          onClick={() => {
                                            setRescheduleTarget(appointment);
                                            setRescheduleDate(appointment.date);
                                            setRescheduleTime(appointment.startTime);
                                            setRescheduleBarberId(appointment.barberId);
                                            setActiveMenu(null);
                                            setMenuRect(null);
                                          }}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-blue-400 hover:bg-[#242424] transition-colors"
                                          aria-label="Reprogramar turno"
                                        >
                                          <FiClock className="text-sm" /> Reprogramar
                                        </button>
                                      <button
                                        onClick={() => { setConfirmTarget({ id: appointment.id, action: 'NoShow' }); setActiveMenu(null); setMenuRect(null); }}
                                        disabled={isUpdatingStatus}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-yellow-400 hover:bg-[#242424] transition-colors disabled:opacity-50"
                                        aria-label="Marcar como no asistió"
                                      >
                                        <FiXCircle className="text-sm" /> No asistió
                                      </button>
                                      <hr className="border-[#282828] my-1" />
                                      <button
                                        onClick={() => { setCancelTarget(appointment); setCancelReason(''); setActiveMenu(null); setMenuRect(null); }}
                                        disabled={isCancelling}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-400 hover:bg-[#242424] transition-colors disabled:opacity-50"
                                        aria-label="Cancelar turno"
                                      >
                                        <FiX className="text-sm" /> Cancelar
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            {appointment.status === 'Cancelado' && appointment.cancelReason && (
                              <span className="text-[11px] text-[#8A8A8A] max-w-[120px] truncate" title={appointment.cancelReason}>
                                {appointment.cancelReason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-[#282828]/50">
                          <td colSpan={10} className="px-6 pb-4 pt-2">
                            <div className="grid grid-cols-3 gap-4 text-[13px]">
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Pago</h4>
                                <div className="flex items-center gap-2">
                                  {paymentBadge(appointment.paymentStatus)}
                                  <span className="text-[#8A8A8A]">{methodLabel[appointment.paymentMethod] ?? appointment.paymentMethod}</span>
                                </div>
                                {appointment.paymentMethod === 'memberPass' && (
                                  <p className="text-[11px] text-[#8A8A8A]">Pago por membresía</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Origen</h4>
                                <div className="flex items-center gap-2">
                                  {originBadge(appointment.createdBy)}
                                </div>
                                {appointment.createdBy?.userId && (
                                  <p className="text-[11px] text-[#8A8A8A]">ID: {appointment.createdBy.userId}</p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Cliente</h4>
                                <p className="text-white">{appointment.clientName} {appointment.clientLastname}</p>
                                {appointment.clientEmail && <p className="text-[11px] text-[#8A8A8A]">{appointment.clientEmail}</p>}
                                {appointment.clientPhone && <p className="text-[11px] text-[#8A8A8A]">{appointment.clientPhone}</p>}
                                {appointment.clientKind && (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${appointment.clientKind === 'Registrado' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                                    {appointment.clientKind === 'Registrado' ? 'Cliente registrado' : 'Cliente anónimo'}
                                  </span>
                                )}
                              </div>
                              {appointment.status === 'Cancelado' && (
                                <div className="space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Cancelación</h4>
                                  {appointment.cancelledBy && <p className="text-white">Por: {appointment.cancelledBy}</p>}
                                  {appointment.cancelledAt && <p className="text-[11px] text-[#8A8A8A]">{formatTimestamp(appointment.cancelledAt)}</p>}
                                  {appointment.cancelReason && <p className="text-[11px] text-red-400">Motivo: {appointment.cancelReason}</p>}
                                </div>
                              )}
                              {appointment.statusHistory && appointment.statusHistory.length > 0 && (
                                <div className="col-span-3 space-y-2">
                                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Historial de cambios</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {appointment.statusHistory.map((entry, idx) => (
                                      <div key={idx} className="flex items-center gap-2 rounded-[8px] border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 text-[12px]">
                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusStyles[entry.status]?.bg ?? ''} ${statusStyles[entry.status]?.text ?? ''}`}>
                                          {statusLabel[entry.status] ?? entry.status}
                                        </span>
                                        <span className="text-[#8A8A8A]">{formatTimestamp(entry.timestamp)}</span>
                                        <span className="text-[#6A6A6A]">por {entry.actor}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </>
          )}
        </AnimatedContainer>
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <h3 className="text-[18px] font-bold text-white mb-2">Cancelar turno</h3>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {cancelTarget.clientName} {cancelTarget.clientLastname} &mdash; {formatDate(cancelTarget.date)} a las {formatTime(cancelTarget.startTime)}
            </p>
            <Input
              label="Motivo de cancelación (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: El cliente no pudo asistir"
            />
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setCancelTarget(null)}>
                Volver
              </Button>
              <Button
                onClick={handleCancelConfirm}
                loading={isCancelling}
                variant="danger"
              >
                Confirmar cancelación
              </Button>
            </div>
          </AnimatedContainer>
        </div>
      )}

      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <h3 className="text-[18px] font-bold text-white mb-2">Reprogramar turno</h3>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {rescheduleTarget.clientName} {rescheduleTarget.clientLastname} &mdash; actual: {formatDate(rescheduleTarget.date)} {formatTime(rescheduleTarget.startTime)}
            </p>
            <div className="flex flex-col gap-4">
              <DatePicker
                label="Nueva fecha"
                value={rescheduleDate}
                onChange={setRescheduleDate}
              />
              <Input
                label="Nueva hora"
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
              <Select
                label="Barbero"
                value={rescheduleBarberId}
                onChange={setRescheduleBarberId}
                options={[
                  { value: '', label: 'Seleccionar barbero' },
                  ...barbers.map((b) => ({ value: b.id, label: `${b.name} ${b.lastname}` })),
                ]}
              />
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setRescheduleTarget(null)}>
                Volver
              </Button>
              <Button
                onClick={handleRescheduleConfirm}
                loading={isRescheduling}
                disabled={!rescheduleDate || !rescheduleTime || !rescheduleBarberId}
              >
                Confirmar reprogramación
              </Button>
            </div>
          </AnimatedContainer>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmTarget !== null}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) {
            handleStatusChange(confirmTarget.id, confirmTarget.action);
            setConfirmTarget(null);
          }
        }}
        title="Marcar como no asistió"
        message="¿Estás seguro de marcar este turno como no asistido? Esta acción no se puede deshacer."
        confirmText="Sí, marcar como no asistió"
        variant="danger"
        loading={isUpdatingStatus}
      />

      {combinedActionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            {combinedActionTarget.primaryAction === 'Completado' ? (
              <>
                <h3 className="text-[18px] font-bold text-white mb-2">Completar turno</h3>
                <p className="text-[13px] text-[#8A8A8A] mb-4">
                  {combinedActionTarget.appointment.clientName} {combinedActionTarget.appointment.clientLastname} &mdash; ¿el cliente ya pagó?
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={async () => {
                      await handleStatusChange(combinedActionTarget.appointment.id, 'Completado');
                      setCombinedActionTarget(null);
                    }}
                    loading={isUpdatingStatus}
                  >
                    Solo completar
                  </Button>
                  <Button
                    onClick={async () => {
                      await handleStatusChange(combinedActionTarget.appointment.id, 'Completado');
                      await markAsPaid({ id: combinedActionTarget.appointment.id }).unwrap();
                      showToast('Turno completado y pago registrado');
                      setCombinedActionTarget(null);
                    }}
                    loading={isUpdatingStatus || isMarkingPaid}
                    variant="secondary"
                  >
                    Completar y marcar pagado
                  </Button>
                  <Button variant="secondary" onClick={() => setCombinedActionTarget(null)}>
                    Volver
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[18px] font-bold text-white mb-2">Registrar pago</h3>
                <p className="text-[13px] text-[#8A8A8A] mb-4">
                  {combinedActionTarget.appointment.clientName} {combinedActionTarget.appointment.clientLastname} &mdash; ¿el servicio ya se completó?
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={async () => {
                      await markAsPaid({ id: combinedActionTarget.appointment.id }).unwrap();
                      showToast('Pago registrado con éxito');
                      setCombinedActionTarget(null);
                    }}
                    loading={isMarkingPaid}
                  >
                    Solo marcar pagado
                  </Button>
                  <Button
                    onClick={async () => {
                      await handleStatusChange(combinedActionTarget.appointment.id, 'Completado');
                      await markAsPaid({ id: combinedActionTarget.appointment.id }).unwrap();
                      showToast('Turno completado y pago registrado');
                      setCombinedActionTarget(null);
                    }}
                    loading={isUpdatingStatus || isMarkingPaid}
                    variant="secondary"
                  >
                    Marcar pagado y completar
                  </Button>
                  <Button variant="secondary" onClick={() => setCombinedActionTarget(null)}>
                    Volver
                  </Button>
                </div>
              </>
            )}
          </AnimatedContainer>
        </div>
      )}

      <AppointmentDetailModal
        appointment={detailTarget}
        isOpen={detailTarget !== null}
        onClose={() => setDetailTarget(null)}
        onComplete={(appt) => { setCombinedActionTarget({ appointment: appt, primaryAction: 'Completado' }); setDetailTarget(null); }}
        onNoShow={(id) => { setConfirmTarget({ id, action: 'NoShow' }); setDetailTarget(null); }}
        onCancel={(appt) => { setCancelTarget(appt); setCancelReason(''); setDetailTarget(null); }}
        onReschedule={(appt) => { setRescheduleTarget(appt); setRescheduleDate(appt.date); setRescheduleTime(appt.startTime); setRescheduleBarberId(appt.barberId); setDetailTarget(null); }}
        onMarkAsPaid={(appt) => { setCombinedActionTarget({ appointment: appt, primaryAction: 'Pagado' }); setDetailTarget(null); }}
        onDuplicate={handleDuplicate}
        onSendReminder={handleSendReminder}
        onChangeBarber={(appt) => { setChangeBarberTarget(appt); setChangeBarberNewId(''); setDetailTarget(null); }}
        isCompleting={isUpdatingStatus}
        isMarkingNoShow={isUpdatingStatus}
        isMarkingPaid={isMarkingPaid}
        isSendingReminder={isSendingReminder}
      />

      {changeBarberTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <h3 className="text-[18px] font-bold text-white mb-2">Cambiar barbero</h3>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {changeBarberTarget.clientName} {changeBarberTarget.clientLastname} &mdash; {formatDate(changeBarberTarget.date)} {formatTime(changeBarberTarget.startTime)}
            </p>
            <Select
              label="Nuevo barbero"
              value={changeBarberNewId}
              onChange={setChangeBarberNewId}
              options={[
                { value: '', label: 'Seleccionar barbero' },
                ...barbers.map((b) => ({ value: b.id, label: `${b.name} ${b.lastname}` })),
              ]}
            />
            <div className="flex gap-3 mt-6">
              <Button variant="secondary" onClick={() => setChangeBarberTarget(null)}>
                Volver
              </Button>
              <Button
                onClick={handleChangeBarberConfirm}
                loading={isChangingBarber}
                disabled={!changeBarberNewId}
              >
                Confirmar cambio
              </Button>
            </div>
          </div>
        </div>
      )}

      {showQuickCreate && (
        <QuickCreateModal
          dateStr={quickCreateDate}
          onClose={() => setShowQuickCreate(false)}
        />
      )}

    </div>
  );
};

export default AdminAppointmentsPage;
