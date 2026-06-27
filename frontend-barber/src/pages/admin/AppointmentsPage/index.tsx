import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiScissors,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import { AnimatedContainer, Button, ConfirmModal, Input, Spinner, useToast } from '../../../components/common';
import { useAppSelector } from '../../../store/hooks';
import {
  useCancelAppointmentMutation,
  useGetAppointmentsQuery,
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

const todayStr = () => new Date().toISOString().slice(0, 10);

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

export const AdminAppointmentsPage: React.FC = () => {
  const barbers = useAppSelector((state) => state.barbers.list);
  const { showToast } = useToast();

  const [filterDate, setFilterDate] = useState(todayStr());
  const [filterBarberId, setFilterBarberId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBarberId, setRescheduleBarberId] = useState('');

  const queryParams = useMemo(() => {
    const params: { date?: string; barberId?: string } = {};
    if (filterDate) params.date = filterDate;
    if (filterBarberId) params.barberId = filterBarberId;
    return params;
  }, [filterDate, filterBarberId]);

  const { data: appointments = [], isLoading, isFetching, error } = useGetAppointmentsQuery(queryParams, {
    pollingInterval: 30000,
  });

  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateAppointmentStatusMutation();
  const [rescheduleAppointment, { isLoading: isRescheduling }] = useRescheduleAppointmentMutation();

  const filtered = useMemo(() => {
    let result = appointments;
    if (filterStatus) {
      result = result.filter((a) => a.status === filterStatus);
    }
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
    return result;
  }, [appointments, filterStatus, searchTerm]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const confirmed = appointments.filter((a) => a.status === 'Confirmado').length;
    const completed = appointments.filter((a) => a.status === 'Completado').length;
    const cancelled = appointments.filter((a) => a.status === 'Cancelado').length;
    return { total, confirmed, completed, cancelled };
  }, [appointments]);

  const [statusError, setStatusError] = useState<string | null>(null);
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
      setStatusError(null);
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  const handleStatusChange = async (id: string, status: 'Completado' | 'NoShow') => {
    try {
      await updateStatus({ id, status }).unwrap();
      const label = status === 'Completado' ? 'completado' : 'marcado como no asistió';
      showToast(`Turno ${label} con éxito`);
      setStatusError(null);
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
      setStatusError(null);
    } catch (err) {
      showToast(extractError(err), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">

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

          <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
              <p className="text-[12px] text-[#8A8A8A]">Total</p>
              <p className="mt-2 text-[24px] font-bold text-white">{stats.total}</p>
            </div>
            <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
              <p className="text-[12px] text-[#8A8A8A]">Confirmados</p>
              <p className="mt-2 text-[24px] font-bold text-blue-400">{stats.confirmed}</p>
            </div>
            <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
              <p className="text-[12px] text-[#8A8A8A]">Completados</p>
              <p className="mt-2 text-[24px] font-bold text-green-400">{stats.completed}</p>
            </div>
            <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
              <p className="text-[12px] text-[#8A8A8A]">Cancelados</p>
              <p className="mt-2 text-[24px] font-bold text-red-400">{stats.cancelled}</p>
            </div>
          </div>
        </AnimatedContainer>

        <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <Input
              label="Fecha"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
            <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1">
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
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <Input
                label="Buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cliente, servicio..."
              />
            </div>
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
              <p className="text-[12px] mt-1">Probá cambiar los filtros o seleccionar otra fecha.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#282828] text-[#8A8A8A] text-[12px] uppercase tracking-wider">
                    <th className="pb-3 pr-4 font-medium">Cliente</th>
                    <th className="pb-3 pr-4 font-medium">Barbero</th>
                    <th className="pb-3 pr-4 font-medium">Servicio</th>
                    <th className="pb-3 pr-4 font-medium">Fecha</th>
                    <th className="pb-3 pr-4 font-medium">Hora</th>
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
                        <td className="py-3 pr-4 text-white">{appointment.date}</td>
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
                              <>
                                <button
                                  onClick={() => handleStatusChange(appointment.id, 'Completado')}
                                  disabled={isUpdatingStatus}
                                  className="rounded-[8px] border border-green-500/30 p-1.5 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                                  title="Marcar como completado"
                                >
                                  <FiCheck className="text-sm" />
                                </button>
                                <button
                                  onClick={() => {
                                    setRescheduleTarget(appointment);
                                    setRescheduleDate(appointment.date);
                                    setRescheduleTime(appointment.startTime);
                                    setRescheduleBarberId(appointment.barberId);
                                  }}
                                  className="rounded-[8px] border border-blue-500/30 p-1.5 text-blue-400 hover:bg-blue-500/10 transition-colors"
                                  title="Reprogramar"
                                >
                                  <FiClock className="text-sm" />
                                </button>
                                <button
                                  onClick={() => setConfirmTarget({ id: appointment.id, action: 'NoShow' })}
                                  disabled={isUpdatingStatus}
                                  className="rounded-[8px] border border-yellow-500/30 p-1.5 text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                                  title="Marcar como no asistió"
                                >
                                  <FiXCircle className="text-sm" />
                                </button>
                                <button
                                  onClick={() => {
                                    setCancelTarget(appointment);
                                    setCancelReason('');
                                  }}
                                  disabled={isCancelling}
                                  className="rounded-[8px] border border-red-500/30 p-1.5 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                                  title="Cancelar turno"
                                >
                                  <FiX className="text-sm" />
                                </button>
                              </>
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
          )}
        </AnimatedContainer>
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <h3 className="text-[18px] font-bold text-white mb-2">Cancelar turno</h3>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {cancelTarget.clientName} {cancelTarget.clientLastname} &mdash; {cancelTarget.date} a las {formatTime(cancelTarget.startTime)}
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
              {rescheduleTarget.clientName} {rescheduleTarget.clientLastname} &mdash; actual: {rescheduleTarget.date} {formatTime(rescheduleTarget.startTime)}
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
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-medium text-white">Barbero</label>
                <select
                  value={rescheduleBarberId}
                  onChange={(e) => setRescheduleBarberId(e.target.value)}
                  className="h-[40px] rounded-[10px] border border-[#282828] bg-[#1A1A1A] px-3 text-[13px] text-white outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/20"
                >
                  <option value="">Seleccionar barbero</option>
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.lastname}
                    </option>
                  ))}
                </select>
              </div>
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
