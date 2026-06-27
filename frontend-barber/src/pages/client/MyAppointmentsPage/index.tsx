import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { FiCalendar, FiClock, FiRefreshCw, FiScissors, FiX } from 'react-icons/fi';
import { AnimatedContainer, Button, Input, useToast } from '../../../components/common';
import {
  useCancelAppointmentMutation,
  useGetAppointmentsQuery,
  useRescheduleAppointmentMutation,
} from '../../../services/appointmentApi';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { fetchPublicBarbers } from '../../../store/slices/bookingSlice';
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

export const MyAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { showToast } = useToast();
  const { data: appointments = [], isLoading, error } = useGetAppointmentsQuery(
    user ? { clientId: user.id } : skipToken,
    { pollingInterval: 15000 }
  );

  const [cancelAppointment, { isLoading: isCancelling }] = useCancelAppointmentMutation();
  const [rescheduleAppointment, { isLoading: isRescheduling }] = useRescheduleAppointmentMutation();

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBarberId, setRescheduleBarberId] = useState('');

  const barbers = useAppSelector((state) => state.booking.async.barbers);
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(fetchPublicBarbers());
  }, [dispatch]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      await cancelAppointment({ id: cancelTarget.id, reason: cancelReason || undefined }).unwrap();
      showToast('Turno cancelado con éxito');
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al cancelar turno', 'error');
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
      showToast(err instanceof Error ? err.message : 'Error al reprogramar turno', 'error');
    }
  };

  const activeAppointments = appointments.filter((a) => a.status === 'Confirmado');
  const pastAppointments = appointments.filter((a) => a.status !== 'Confirmado');

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-4 py-2 text-[12px] text-[#8A8A8A]">
                <FiScissors className="text-[#FF5C00]" />
                Mis turnos
              </div>
              <h1 className="mt-4 text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[38px]">
                Tus turnos
              </h1>
              <p className="mt-2 text-[14px] text-[#8A8A8A]">
                Revisá, cancelá o reprogramá tus turnos.
              </p>
            </div>
            
          </div>
        </AnimatedContainer>

        {error ? (
          <AnimatedContainer animation="fadeIn" className="rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-[13px] text-red-400">Error al cargar turnos. Verificá la conexión.</p>
          </AnimatedContainer>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20">
            <FiRefreshCw className="animate-spin text-[#FF5C00] text-2xl" />
          </div>
        ) : appointments.length === 0 ? (
          <AnimatedContainer animation="fadeInUp" className="flex flex-col items-center justify-center py-20 text-[#8A8A8A] rounded-[24px] border border-[#282828] bg-[#121212]">
            <FiCalendar className="text-4xl mb-3" />
            <p className="text-[15px]">No tenés turnos registrados</p>
            <p className="text-[12px] mt-1">Reservá tu próximo turno ahora.</p>
            <Button className="mt-4" onClick={() => navigate('/reservar')}>
              Reservar turno
            </Button>
          </AnimatedContainer>
        ) : (
          <>
            {activeAppointments.length > 0 && (
              <div>
                <h2 className="text-[18px] font-bold text-white mb-4">Próximos turnos</h2>
                <div className="grid gap-4">
                  {activeAppointments.map((appointment) => {
                    const style = statusStyles[appointment.status];
                    return (
                      <AnimatedContainer key={appointment.id} animation="fadeInUp" className="rounded-[20px] border border-[#282828] bg-[#121212] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                            </div>
                            <h3 className="text-[16px] font-semibold text-white">{appointment.serviceName}</h3>
                            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[#8A8A8A]">
                              <span className="flex items-center gap-1">
                                <FiCalendar className="text-[#FF5C00]" />
                                {appointment.date}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiClock className="text-[#FF5C00]" />
                                {formatTime(appointment.startTime)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={FiClock}
                              onClick={() => {
                                setRescheduleTarget(appointment);
                                setRescheduleDate(appointment.date);
                                setRescheduleTime(appointment.startTime);
                                setRescheduleBarberId(appointment.barberId);
                              }}
                            >
                              Reprogramar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              icon={FiX}
                              onClick={() => {
                                setCancelTarget(appointment);
                                setCancelReason('');
                              }}
                              disabled={isCancelling}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </AnimatedContainer>
                    );
                  })}
                </div>
              </div>
            )}

            {pastAppointments.length > 0 && (
              <div>
                <h2 className="text-[18px] font-bold text-white mb-4">Historial</h2>
                <div className="grid gap-3">
                  {pastAppointments.map((appointment) => {
                    const style = statusStyles[appointment.status];
                    return (
                      <div key={appointment.id} className="rounded-[16px] border border-[#282828] bg-[#121212] p-4 opacity-70">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                            </div>
                            <p className="text-[14px] font-medium text-white">{appointment.serviceName}</p>
                            <p className="text-[12px] text-[#8A8A8A] mt-0.5">
                              {appointment.date} a las {formatTime(appointment.startTime)}
                            </p>
                            {appointment.cancelReason && (
                              <p className="text-[11px] text-red-400 mt-1">Motivo: {appointment.cancelReason}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <h3 className="text-[18px] font-bold text-white mb-2">Cancelar turno</h3>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {cancelTarget.serviceName} &mdash; {cancelTarget.date} a las {formatTime(cancelTarget.startTime)}
            </p>
            <Input
              label="Motivo (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ej: No podré asistir"
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
              {rescheduleTarget.serviceName} &mdash; actual: {rescheduleTarget.date} {formatTime(rescheduleTarget.startTime)}
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
    </div>
  );
};

export default MyAppointmentsPage;
