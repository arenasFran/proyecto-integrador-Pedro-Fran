import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiMoreVertical,
  FiScissors,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import { AnimatedContainer, Button, ConfirmModal, Input, Pagination, Spinner, StatsCards, useToast } from '../../../components/common';
import { formatDate } from '../../../utils/formatDate';
import { useAppSelector } from '../../../store/hooks';
import {
  useCancelAppointmentMutation,
  useGetAppointmentsPaginatedQuery,
  useRescheduleAppointmentMutation,
  useUpdateAppointmentStatusMutation,
} from '../../../services/appointmentApi';
import type { Appointment, AppointmentStatus } from '../../../types/booking';

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

export const AdminAppointmentsPage: React.FC = () => {
  const barbers = useAppSelector((state) => state.barbers.list);
  const { showToast } = useToast();

  const [filterDate, setFilterDate] = useState('');
  const [filterBarberId, setFilterBarberId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuRect, setMenuRect] = useState<{ top: number; right: number } | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

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

  const clearFilters = () => {
    setFilterDate('');
    setFilterBarberId('');
    setFilterStatus('');
    setSearchTerm('');
    setSortBy(null);
    setSortDir('asc');
    setPage(1);
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const queryParams = useMemo(() => {
    const params: { date?: string; barberId?: string; status?: string; page?: number; limit?: number } = {};
    if (filterDate) params.date = filterDate;
    if (filterBarberId) params.barberId = filterBarberId;
    if (filterStatus) params.status = filterStatus;
    params.page = page;
    params.limit = PAGE_SIZE;
    return params;
  }, [filterDate, filterBarberId, filterStatus, page]);

  const { data: paginatedData, isLoading, isFetching, error } = useGetAppointmentsPaginatedQuery(queryParams, {
    pollingInterval: 30000,
  });

  const appointments = paginatedData?.appointments ?? [];
  const totalResults = paginatedData?.total ?? 0;
  const totalPages = paginatedData?.totalPages ?? 1;

  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();
  const [rescheduleAppointment, { isLoading: isRescheduling }] = useRescheduleAppointmentMutation();

  const filtered = useMemo(() => {
    let result = appointments;
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        (a) =>
          a.clientName.toLowerCase().includes(q) ||
          a.clientLastname.toLowerCase().includes(q) ||
          a.clientEmail?.toLowerCase().includes(q) ||
          a.serviceName.toLowerCase().includes(q)
      );
    }
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const valA = sortBy === 'date' ? a.date : a.startTime;
        const valB = sortBy === 'date' ? b.date : b.startTime;
        const cmp = valA.localeCompare(valB);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [appointments, searchTerm, sortBy, sortDir]);

  const stats = useMemo(() => {
    const total = totalResults;
    const confirmed = appointments.filter((a) => a.status === 'Confirmado').length;
    const completed = appointments.filter((a) => a.status === 'Completado').length;
    const cancelled = appointments.filter((a) => a.status === 'Cancelado').length;
    return { total, confirmed, completed, cancelled };
  }, [appointments, totalResults]);

  useEffect(() => {
    setPage(1);
  }, [filterDate, filterBarberId, filterStatus]);

  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'NoShow' } | null>(null);

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
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-[#8A8A8A] sm:text-[15px]">
                Visualizá, cancelá, reprogramá y cambiá el estado de los turnos de forma centralizada.
              </p>
            </div>

            
          </div>

          <StatsCards stats={stats} />
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div className="w-full sm:w-[180px]">
              <Input
                label="Fecha"
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-[180px]">
              <label className="text-[13px] font-medium text-white">Barbero</label>
              <select
                value={filterBarberId}
                onChange={(e) => setFilterBarberId(e.target.value)}
                className="h-[40px] rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 text-[13px] text-white outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/20"
              >
                <option value="">Todos</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.lastname}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-full sm:w-[160px]">
              <label className="text-[13px] font-medium text-white">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-[40px] rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 text-[13px] text-white outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/20"
              >
                <option value="">Todos</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Completado">Completado</option>
                <option value="Cancelado">Cancelado</option>
                <option value="NoShow">No asistió</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input
                label="Buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cliente, servicio..."
              />
            </div>
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 h-[40px] rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 text-[13px] font-medium text-[#8A8A8A] transition-colors hover:text-white hover:border-[#FF5C00]"
            >
              <FiX className="text-sm" />
              Limpiar
            </button>
            {(isLoading || isFetching) && (
              <div className="flex items-center gap-2 text-[#8A8A8A] text-[13px]">
                <Spinner size="sm" />
                Actualizando...
              </div>
            )}
          </div>

          {error ? (
            <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3">
              <p className="text-[13px] text-red-400">Error al cargar turnos. Verificá la conexión.</p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#8A8A8A]">
              <FiCalendar className="text-4xl mb-3" />
              <p className="text-[15px]">No se encontraron turnos</p>
              <p className="text-[12px] mt-1">Probá cambiar los filtros o seleccionar otro rango de fechas.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[#282828] text-[#8A8A8A] text-[12px] uppercase tracking-wider">
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
                          Hora
                          {sortBy === 'time' ? (
                            sortDir === 'asc' ? <FiChevronUp className="text-[11px]" /> : <FiChevronDown className="text-[11px]" />
                          ) : (
                            <FiChevronUp className="text-[11px] opacity-30" />
                          )}
                        </button>
                      </th>
                      <th className="pb-3 pr-4 font-medium">Estado</th>
                      <th className="pb-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((appointment) => {
                      const style = statusStyles[appointment.status];
                      const isActive = appointment.status === 'Confirmado';
                      return (
                        <tr key={appointment.id} className="border-b border-[#282828]/50 hover:bg-[#1A1A1A]/80 transition-colors">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-white">{appointment.clientName} {appointment.clientLastname}</div>
                            {appointment.clientEmail && (
                              <div className="text-[11px] text-[#8A8A8A]">{appointment.clientEmail}</div>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-[#8A8A8A]">
                            {barbers.find((b) => b.id === appointment.barberId)?.name ?? appointment.barberId.slice(-6)}
                          </td>
                          <td className="py-3 pr-4 text-[#8A8A8A]">{appointment.serviceName}</td>
                          <td className="py-3 pr-4 text-white">{formatDate(appointment.date)}</td>
                          <td className="py-3 pr-4 text-white">{formatTime(appointment.startTime)}</td>
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
                                            onClick={() => { handleStatusChange(appointment.id, 'Completado'); setActiveMenu(null); setMenuRect(null); }}
                                            disabled={isUpdatingStatus}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-green-400 hover:bg-[#242424] transition-colors disabled:opacity-50"
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
              <Input
                label="Nueva fecha"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
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
    </div>
  );
};

export default AdminAppointmentsPage;
