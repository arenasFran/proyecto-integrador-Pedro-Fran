import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { skipToken } from '@reduxjs/toolkit/query';
import { FiCalendar, FiClock, FiRefreshCw, FiScissors, FiX } from 'react-icons/fi';
import { AnimatedContainer, Button, Input, Pagination, Select, useToast, Calendar } from '../../../components/common';
import { formatDate } from '../../../utils/formatDate';
import { formatTime } from '../../../utils/formatTime';
import {
  useCancelAppointmentMutation,
  useGetAppointmentsQuery,
  useRescheduleAppointmentMutation,
} from '../../../services/appointmentApi';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { fetchPublicBarbers } from '../../../store/slices/bookingSlice';
import { useAvailableSlots } from '../../../hooks/useAvailableSlots';
import { TimeSlotGrid } from '../../../components/client/booking/TimeSlotGrid';
import type { Appointment, AppointmentStatus } from '../../../types/booking';

const statusStyles: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Confirmado' },
  Completado: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completado' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
  NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'No asistió' },
};

const paymentMethodLabels: Record<string, { label: string; bg: string; text: string }> = {
  local: { label: 'Pago en local', bg: 'bg-[#FF5C00]/10', text: 'text-[#FF5C00]' },
  memberPass: { label: 'Membresía', bg: 'bg-purple-500/10', text: 'text-purple-400' },
  online: { label: 'Pago online', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
};

const paymentStatusLabels: Record<string, { label: string; bg: string; text: string }> = {
  Pendiente: { label: 'Pendiente', bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
  Pagado: { label: 'Pagado', bg: 'bg-green-500/10', text: 'text-green-400' },
  Cancelado: { label: 'Cancelado', bg: 'bg-red-500/10', text: 'text-red-400' },
};

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
  const { slots: rescheduleSlots, reason: slotsReason, isLoading: isLoadingSlots, error: slotsError } = useAvailableSlots(
    rescheduleBarberId,
    rescheduleDate,
    !!rescheduleTarget,
    rescheduleTarget?.id
  );

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

  const handleRescheduleDateChange = (date: string) => {
    setRescheduleDate(date);
    setRescheduleTime('');
  };

  const handleRescheduleBarberChange = (barberId: string) => {
    setRescheduleBarberId(barberId);
    setRescheduleTime('');
  };

  const [pastPage, setPastPage] = useState(1);
  const PAST_PAGE_SIZE = 10;

  const activeAppointments = appointments.filter((a) => a.status === 'Confirmado');
  const pastAppointments = appointments.filter((a) => a.status !== 'Confirmado');

  const pastTotalPages = Math.ceil(pastAppointments.length / PAST_PAGE_SIZE) || 1;
  const paginatedPast = useMemo(
    () => pastAppointments.slice((pastPage - 1) * PAST_PAGE_SIZE, pastPage * PAST_PAGE_SIZE),
    [pastAppointments, pastPage]
  );

  const [prevAppLength, setPrevAppLength] = useState(appointments.length);
  if (appointments.length !== prevAppLength) {
    setPrevAppLength(appointments.length);
    setPastPage(1);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">

      <div className="relative mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatedContainer animation="fadeInDown" className="rounded-[24px] border border-[#282828] bg-[#121212] p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-[12px] text-[#8A8A8A]">
                <FiScissors className="text-[#FF5C00]" />
                Mis turnos
              </div>
              <h1 className="mt-3 sm:mt-4 text-[22px] sm:text-[38px] font-extrabold tracking-[-0.02em] text-white">
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
                      <AnimatedContainer key={appointment.id} animation="fadeInUp" className="rounded-[20px] border border-[#282828] bg-[#121212] p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                              {appointment.paymentMethod && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${(paymentMethodLabels[appointment.paymentMethod]?.bg ?? 'bg-[#282828]')} ${(paymentMethodLabels[appointment.paymentMethod]?.text ?? 'text-[#8A8A8A]')}`}>
                                  {paymentMethodLabels[appointment.paymentMethod]?.label ?? appointment.paymentMethod}
                                </span>
                              )}
                              {appointment.paymentStatus && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${(paymentStatusLabels[appointment.paymentStatus]?.bg ?? 'bg-[#282828]')} ${(paymentStatusLabels[appointment.paymentStatus]?.text ?? 'text-[#8A8A8A]')}`}>
                                  {paymentStatusLabels[appointment.paymentStatus]?.label ?? appointment.paymentStatus}
                                </span>
                              )}
                            </div>
                            <h3 className="text-[16px] font-semibold text-white">{appointment.serviceName}</h3>
                            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-[#8A8A8A]">
                              <span className="flex items-center gap-1">
                                <FiCalendar className="text-[#FF5C00]" />
                                {formatDate(appointment.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <FiClock className="text-[#FF5C00]" />
                                {formatTime(appointment.startTime)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
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
                              <span className="hidden sm:inline">Reprogramar</span>
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
                              <span className="hidden sm:inline">Cancelar</span>
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
                <h2 className="text-[18px] font-bold text-white mb-4">Historial ({pastAppointments.length})</h2>
                <div className="grid gap-3">
                  {paginatedPast.map((appointment) => {
                    const style = statusStyles[appointment.status];
                    return (
                      <div key={appointment.id} className="rounded-[16px] border border-[#282828] bg-[#121212] p-3 sm:p-4 opacity-60 sm:opacity-70">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                                {style.label}
                              </span>
                              {appointment.paymentMethod && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${(paymentMethodLabels[appointment.paymentMethod]?.bg ?? 'bg-[#282828]')} ${(paymentMethodLabels[appointment.paymentMethod]?.text ?? 'text-[#8A8A8A]')}`}>
                                  {paymentMethodLabels[appointment.paymentMethod]?.label ?? appointment.paymentMethod}
                                </span>
                              )}
                              {appointment.paymentStatus && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${(paymentStatusLabels[appointment.paymentStatus]?.bg ?? 'bg-[#282828]')} ${(paymentStatusLabels[appointment.paymentStatus]?.text ?? 'text-[#8A8A8A]')}`}>
                                  {paymentStatusLabels[appointment.paymentStatus]?.label ?? appointment.paymentStatus}
                                </span>
                              )}
                            </div>
                            <p className="text-[14px] font-medium text-white">{appointment.serviceName}</p>
                            <p className="text-[12px] text-[#8A8A8A] mt-0.5">
                              {formatDate(appointment.date)} a las {formatTime(appointment.startTime)}
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
                <Pagination currentPage={pastPage} totalPages={pastTotalPages} onPageChange={setPastPage} />
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
              {cancelTarget.serviceName} &mdash; {formatDate(cancelTarget.date)} a las {formatTime(cancelTarget.startTime)}
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 px-4 py-6">
          <AnimatedContainer animation="fadeIn" className="mx-auto w-full max-w-md md:max-w-2xl rounded-[24px] border border-[#282828] bg-[#121212] p-6">
            <h3 className="text-[18px] font-bold text-white mb-2">Reprogramar turno</h3>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {rescheduleTarget.serviceName} &mdash; actual: {formatDate(rescheduleTarget.date)} {formatTime(rescheduleTarget.startTime)}
            </p>
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6">
              <div>
                <p className="text-[13px] font-medium text-[#8A8A8A] mb-1">Nueva fecha</p>
                <Calendar
                  selectedDate={rescheduleDate || null}
                  onSelectDate={handleRescheduleDateChange}
                  maxAdvanceDays={barbers.find((b) => b.id === rescheduleBarberId)?.maxAdvanceDays ?? 30}
                  schedule={barbers.find((b) => b.id === rescheduleBarberId)?.schedule}
                />
              </div>
              <div className="flex flex-col gap-4">
                <TimeSlotGrid
                  slots={rescheduleSlots}
                  selectedTime={rescheduleTime}
                  selectedDate={rescheduleDate}
                  isLoading={isLoadingSlots}
                  error={slotsError}
                  reason={slotsReason}
                  onSelect={setRescheduleTime}
                />
                <Select
                  label="Barbero"
                  value={rescheduleBarberId}
                  onChange={handleRescheduleBarberChange}
                  options={[
                    { value: '', label: 'Seleccionar barbero' },
                    ...barbers.map((b) => ({ value: b.id, label: `${b.name} ${b.lastname}` })),
                  ]}
                />
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
