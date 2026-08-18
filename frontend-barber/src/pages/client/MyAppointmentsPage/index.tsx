import React, { useEffect, useMemo, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiCheckCircle, FiClock, FiRefreshCw, FiScissors, FiUser, FiX } from 'react-icons/fi';
import { AnimatedContainer, Button, Calendar, ClientPageShell, ClientState, Input, Modal, Pagination, Select, StatusBadge, useToast } from '../../../components/common';
import { formatCurrency } from '../../../utils/formatCurrency';
import { formatDate } from '../../../utils/formatDate';
import { formatTime } from '../../../utils/formatTime';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchPublicBarbers } from '../../../store/slices/bookingSlice';
import { useAvailableSlots } from '../../../hooks/useAvailableSlots';
import { TimeSlotGrid } from '../../../components/client/booking/TimeSlotGrid';
import {
  useCancelAppointmentMutation,
  useGetAppointmentsQuery,
  useRescheduleAppointmentMutation,
} from '../../../services/appointmentApi';
import type { Appointment, AppointmentStatus } from '../../../types/booking';

const statusConfig: Record<AppointmentStatus, { label: string; tone: 'success' | 'neutral' | 'danger' | 'warning' }> = {
  Confirmado: { label: 'Confirmado', tone: 'success' },
  Completado: { label: 'Completado', tone: 'neutral' },
  Cancelado: { label: 'Cancelado', tone: 'danger' },
  NoShow: { label: 'No asististe', tone: 'warning' },
};

const paymentConfig: Record<string, { label: string; tone: 'accent' | 'purple' | 'info' }> = {
  local: { label: 'Pago en local', tone: 'accent' },
  memberPass: { label: 'Cupón de membresía', tone: 'purple' },
  online: { label: 'Pago online', tone: 'info' },
};

const paymentStatusConfig: Record<string, { label: string; tone: 'success' | 'danger' | 'warning' }> = {
  Pendiente: { label: 'Pago pendiente', tone: 'warning' },
  Pagado: { label: 'Pagado', tone: 'success' },
  Cancelado: { label: 'Pago cancelado', tone: 'danger' },
};

const getAppointmentTimestamp = (appointment: Appointment) => new Date(`${appointment.date}T${appointment.startTime}`).getTime();

function AppointmentMeta({ appointment, compact = false }: { appointment: Appointment; compact?: boolean }) {
  return (
    <div className={`grid gap-2 ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
      <div className="flex items-center gap-2 text-[12px] text-[#9a9a9a]">
        <FiCalendar className="shrink-0 text-[#FF7A33]" aria-hidden="true" />
        <span>{formatDate(appointment.date)}</span>
      </div>
      <div className="flex items-center gap-2 text-[12px] text-[#9a9a9a]">
        <FiClock className="shrink-0 text-[#FF7A33]" aria-hidden="true" />
        <span>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
      </div>
      {!compact && (
        <div className="flex items-center gap-2 text-[12px] text-[#9a9a9a]">
          <FiClock className="shrink-0 text-[#666]" aria-hidden="true" />
          <span>{appointment.serviceDuration} min</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-[12px] font-medium text-white">
        <span>{formatCurrency(appointment.servicePrice)}</span>
      </div>
    </div>
  );
}

function AppointmentBadges({ appointment }: { appointment: Appointment }) {
  const status = statusConfig[appointment.status];
  const payment = paymentConfig[appointment.paymentMethod];
  const paymentStatus = paymentStatusConfig[appointment.paymentStatus];

  return (
    <div className="flex flex-wrap gap-2">
      <StatusBadge label={status?.label ?? appointment.status} tone={status?.tone ?? 'neutral'} />
      {payment && <StatusBadge label={payment.label} tone={payment.tone} />}
      {paymentStatus && <StatusBadge label={paymentStatus.label} tone={paymentStatus.tone} />}
      {appointment.couponRedeemed && !appointment.couponRestoredAt && <StatusBadge label="Cupón aplicado" tone="purple" icon={<FiCheckCircle aria-hidden="true" />} />}
    </div>
  );
}

function AppointmentCard({
  appointment,
  isFeatured,
  onReschedule,
  onCancel,
  compact = false,
}: {
  appointment: Appointment;
  isFeatured?: boolean;
  compact?: boolean;
  onReschedule?: () => void;
  onCancel?: () => void;
}) {
  return (
    <AnimatedContainer animation="fadeInUp" duration={0.35} className={`overflow-hidden rounded-2xl border bg-[#121212] ${isFeatured ? 'border-[#FF5C00]/45 shadow-[0_18px_55px_rgba(255,92,0,0.08)]' : 'border-[#292929]'}`}>
      {isFeatured && <div className="h-1 bg-gradient-to-r from-[#FF5C00] via-[#FF8A4C] to-transparent" />}
      <div className={`${isFeatured ? 'p-5 sm:p-6' : 'p-4'}`}>
        {isFeatured && <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF8A4C]">Próximo turno</p>}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <AppointmentBadges appointment={appointment} />
            <h2 className={`mt-3 font-semibold text-white ${isFeatured ? 'text-[20px]' : 'text-[15px]'}`}>{appointment.serviceName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex items-center gap-2 text-[12px] text-[#a0a0a0]"><FiUser className="text-[#FF7A33]" aria-hidden="true" />{appointment.barberName ?? 'Barbero asignado'}</span>
              <span className="flex items-center gap-2 text-[12px] text-[#a0a0a0]"><FiScissors className="text-[#FF7A33]" aria-hidden="true" />Servicio reservado</span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {onReschedule && <Button variant="outline" size="sm" icon={FiClock} onClick={onReschedule}><span className="hidden sm:inline">Reprogramar</span></Button>}
            {onCancel && <Button variant="outline" size="sm" icon={FiX} onClick={onCancel}><span className="hidden sm:inline">Cancelar</span></Button>}
          </div>
        </div>

        <div className={`${isFeatured ? 'mt-5 rounded-xl border border-[#292929] bg-[#181818] p-4' : 'mt-4'} `}>
          <AppointmentMeta appointment={appointment} compact={compact} />
        </div>

        {appointment.cancelReason && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-3 text-[12px] text-red-300">Motivo de cancelación: {appointment.cancelReason}</div>}
      </div>
    </AnimatedContainer>
  );
}

export const MyAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { data: appointments = [], isLoading, error, refetch } = useGetAppointmentsQuery(
    user ? { clientId: user.id, includeBarber: 'true', limit: 100, sortBy: 'date', sortDir: 'asc' } : skipToken,
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
  const [pastPage, setPastPage] = useState(1);
  const [now] = useState(() => Date.now());
  const barbers = useAppSelector((state) => state.booking.async.barbers);
  const { slots, reason: slotsReason, isLoading: isLoadingSlots, error: slotsError } = useAvailableSlots(rescheduleBarberId, rescheduleDate, Boolean(rescheduleTarget), rescheduleTarget?.id);

  useEffect(() => { dispatch(fetchPublicBarbers()); }, [dispatch]);

  const { upcoming, past } = useMemo(() => {
    const confirmed = appointments.filter((appointment) => appointment.status === 'Confirmado');
    const upcomingAppointments = confirmed.filter((appointment) => getAppointmentTimestamp(appointment) >= now).sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));
    const upcomingIds = new Set(upcomingAppointments.map((appointment) => appointment.id));
    const pastAppointments = appointments.filter((appointment) => !upcomingIds.has(appointment.id)).sort((a, b) => getAppointmentTimestamp(b) - getAppointmentTimestamp(a));
    return { upcoming: upcomingAppointments, past: pastAppointments };
  }, [appointments, now]);

  const paginatedPast = past.slice((pastPage - 1) * 8, pastPage * 8);
  const totalPastPages = Math.max(1, Math.ceil(past.length / 8));

  const openReschedule = (appointment: Appointment) => {
    setRescheduleTarget(appointment);
    setRescheduleDate(appointment.date);
    setRescheduleTime(appointment.startTime);
    setRescheduleBarberId(appointment.barberId);
  };

  const closeReschedule = () => {
    setRescheduleTarget(null);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleBarberId('');
  };

  const handleCancel = async () => {
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

  const handleReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDate || !rescheduleTime || !rescheduleBarberId) return;
    try {
      await rescheduleAppointment({ id: rescheduleTarget.id, date: rescheduleDate, startTime: rescheduleTime, barberId: rescheduleBarberId }).unwrap();
      showToast('Turno reprogramado con éxito');
      closeReschedule();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al reprogramar turno', 'error');
    }
  };

  return (
    <ClientPageShell eyebrow="Mis turnos" icon={FiScissors} actions={<Button onClick={() => navigate('/reservar')} icon={FiCalendar}>Reservar turno</Button>}>
      {error ? (
        <ClientState icon={FiRefreshCw} title="No pudimos cargar tus turnos" description="Revisá tu conexión y volvé a intentarlo." actionLabel="Reintentar" onAction={() => void refetch()} tone="danger" />
      ) : isLoading ? (
        <div className="grid gap-3" aria-busy="true">
          {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl border border-[#292929] bg-[#121212]" />)}
        </div>
      ) : appointments.length === 0 ? (
        <ClientState icon={FiCalendar} title="Todavía no tenés turnos" description="Elegí un servicio y encontrá un horario que te quede cómodo." actionLabel="Reservar mi primer turno" onAction={() => navigate('/reservar')} />
      ) : (
        <div className="grid gap-8">
          {upcoming.length > 0 && (
            <section className="grid gap-3">
              <div className="flex justify-end"><span className="text-[12px] text-[#666]">{upcoming.length} reservado{upcoming.length === 1 ? '' : 's'}</span></div>
              {upcoming.map((appointment, index) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  isFeatured={index === 0}
                  onReschedule={() => openReschedule(appointment)}
                  onCancel={() => { setCancelTarget(appointment); setCancelReason(''); }}
                />
              ))}
            </section>
          )}

          {past.length > 0 && (
            <section aria-labelledby="history-heading" className="grid gap-3">
              <div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#666]">Registro</p><h2 id="history-heading" className="mt-1 text-[18px] font-semibold text-white">Historial</h2></div><span className="text-[12px] text-[#666]">{past.length} turno{past.length === 1 ? '' : 's'}</span></div>
              <div className="grid gap-2">
                {paginatedPast.map((appointment) => (
                  <AppointmentCard key={appointment.id} appointment={appointment} compact />
                ))}
              </div>
              {totalPastPages > 1 && <Pagination currentPage={pastPage} totalPages={totalPastPages} onPageChange={setPastPage} />}
            </section>
          )}
        </div>
      )}

      <Modal isOpen={Boolean(cancelTarget)} onClose={() => setCancelTarget(null)} title="Cancelar turno" size="sm">
        {cancelTarget && <>
          <p className="text-[13px] leading-5 text-[#8a8a8a]">{cancelTarget.serviceName} · {formatDate(cancelTarget.date)} a las {formatTime(cancelTarget.startTime)}</p>
          <div className="mt-5"><Input label="Motivo (opcional)" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ej: No podré asistir" /></div>
          <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={() => setCancelTarget(null)}>Volver</Button><Button variant="danger" loading={isCancelling} onClick={handleCancel}>Confirmar cancelación</Button></div>
        </>}
      </Modal>

      <Modal isOpen={Boolean(rescheduleTarget)} onClose={closeReschedule} title="Reprogramar turno" size="xl">
        {rescheduleTarget && <>
          <p className="text-[13px] leading-5 text-[#8a8a8a]">Turno actual: {formatDate(rescheduleTarget.date)} a las {formatTime(rescheduleTarget.startTime)}</p>
          <div className="mt-5 grid gap-5 md:grid-cols-2"><div><p className="mb-2 text-[12px] font-medium text-[#a0a0a0]">Nueva fecha</p><Calendar selectedDate={rescheduleDate || null} onSelectDate={(date) => { setRescheduleDate(date); setRescheduleTime(''); }} maxAdvanceDays={barbers.find((barber) => barber.id === rescheduleBarberId)?.maxAdvanceDays ?? 30} schedule={barbers.find((barber) => barber.id === rescheduleBarberId)?.schedule} /></div><div className="grid content-start gap-4"><Select label="Barbero" value={rescheduleBarberId} onChange={(barberId) => { setRescheduleBarberId(barberId); setRescheduleTime(''); }} options={[{ value: '', label: 'Seleccionar barbero' }, ...barbers.map((barber) => ({ value: barber.id, label: `${barber.name} ${barber.lastname}` }))]} /><TimeSlotGrid slots={slots} selectedTime={rescheduleTime} selectedDate={rescheduleDate} isLoading={isLoadingSlots} error={slotsError} reason={slotsReason} onSelect={setRescheduleTime} /></div></div>
          <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={closeReschedule}>Volver</Button><Button loading={isRescheduling} disabled={!rescheduleDate || !rescheduleTime || !rescheduleBarberId} onClick={handleReschedule}>Confirmar reprogramación</Button></div>
        </>}
      </Modal>
    </ClientPageShell>
  );
};

export default MyAppointmentsPage;
