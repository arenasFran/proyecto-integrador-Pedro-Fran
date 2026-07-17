import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { IconType } from 'react-icons';
import {
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiUser,
  FiMail,
  FiPhone,
  FiScissors,
  FiCheck,
  FiX,
  FiXCircle,
  FiPlusCircle,
  FiCreditCard,
} from 'react-icons/fi';
import { BarberAvatar, Modal, Button } from '../../../components/common';
import type { Appointment, AppointmentStatus, CreatedBy } from '../../../types/booking';
import { formatDate, formatDateTime } from '../../../utils/formatDate';
import PaymentTransactionDetail from '../../../components/payment/PaymentTransactionDetail';
import { useGetPaymentByReferenceQuery } from '../../../services/paymentApi';

const statusStyles: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Confirmado' },
  Completado: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completado' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
  NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'No asistió' },
};

const statusLabel: Record<string, string> = {
  Confirmado: 'Confirmado', Completado: 'Completado', Cancelado: 'Cancelado', NoShow: 'No asistió',
};

const timelineIcon: Record<'created' | AppointmentStatus, IconType> = {
  created: FiPlusCircle,
  Confirmado: FiCalendar,
  Completado: FiCheck,
  Cancelado: FiX,
  NoShow: FiXCircle,
};

const timelineStyles: Record<'created' | AppointmentStatus, { bg: string; text: string }> = {
  created: { bg: 'bg-[#242424]', text: 'text-[#8A8A8A]' },
  ...statusStyles,
};

const methodLabel: Record<string, string> = { local: 'Local', online: 'Online', memberPass: 'Membresía' };

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

function formatTimestamp(ts: string) {
  return formatDateTime(ts);
}

function originBadge(cb?: CreatedBy) {
  if (!cb) return <span className="text-[12px] text-[#8A8A8A]">—</span>;
  const config: Record<string, { label: string; color: string }> = {
    staff: { label: 'Barbero', color: 'bg-purple-500/10 text-purple-400' },
    registered: { label: 'Web', color: 'bg-blue-500/10 text-blue-400' },
    anonymous: { label: 'Invitado', color: 'bg-gray-500/10 text-gray-400' },
  };
  const c = config[cb.type] ?? { label: cb.type, color: 'bg-gray-500/10 text-gray-400' };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c.color}`}>{c.label}</span>;
}

function originWithName(cb?: CreatedBy, actorName?: string) {
  const badge = originBadge(cb);
  if (cb?.type !== 'staff' || !actorName) return badge;
  return (
    <span className="inline-flex items-center gap-1.5">
      {badge}
      <span className="text-white">{actorName}</span>
    </span>
  );
}

function paymentBadge(ps: Appointment['paymentStatus']) {
  const styles: Record<string, { bg: string; text: string }> = {
    Pendiente: { bg: 'bg-yellow-500/10', text: 'text-yellow-400' },
    Pagado: { bg: 'bg-green-500/10', text: 'text-green-400' },
    Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400' },
  };
  const s = styles[ps] ?? styles.Pendiente;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>{ps}</span>
  );
}

function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">{children}</h4>
      {action}
    </div>
  );
}

function InfoRow({ icon: Icon, children }: { icon: IconType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-2 text-[13px] text-[#8A8A8A] first:pt-0 last:pb-0">
      <Icon className="shrink-0 text-[#FF5C00]" size={14} />
      <span className="text-white truncate">{children}</span>
    </div>
  );
}

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onCreateAppointment?: (appointment: Appointment) => void;
}

interface TimelineEntry {
  key: string;
  icon: IconType;
  styles: { bg: string; text: string };
  label: string;
  timestamp: string;
  origin?: CreatedBy;
  actor?: string;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onCreateAppointment,
}) => {
  const navigate = useNavigate();

  const { data: paymentData } = useGetPaymentByReferenceQuery(
    { referenceId: appointment?.id || '', type: 'appointment' },
    { skip: !appointment?.id || appointment?.paymentMethod !== 'online' }
  );

  if (!appointment) return null;

  const style = statusStyles[appointment.status];
  const clientSinceYear = appointment.clientRegisteredAt ? new Date(appointment.clientRegisteredAt).getFullYear() : null;

  // El backend nunca completa clientKind en un turno, así que no podemos
  // armar acá la clave compuesta "reg_"/"anon_" que usa /admin/clientes.
  // Navegamos con el clientId a secas; ClientDetailPage matchea por clientId
  // además de por key.
  const goToClientDetail = () => {
    if (!appointment.clientId) return;
    onClose();
    navigate(`/admin/clientes/${appointment.clientId}`);
  };

  const creationActor = appointment.statusHistory?.[0]?.actor;

  const timeline: TimelineEntry[] = [
    { key: 'created', icon: timelineIcon.created, styles: timelineStyles.created, label: 'Turno creado', timestamp: appointment.createdAt, origin: appointment.createdBy, actor: creationActor },
    ...(appointment.statusHistory ?? []).map((entry, idx) => ({
      key: `status-${idx}`,
      icon: timelineIcon[entry.status],
      styles: timelineStyles[entry.status],
      label: statusLabel[entry.status] ?? entry.status,
      timestamp: entry.timestamp,
      actor: entry.actor,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del turno" size="xl">
      <div className="flex flex-col gap-7">
        {/* Encabezado del cliente */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-4 border-b border-[#282828]">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <BarberAvatar
              name={appointment.clientName}
              lastname={appointment.clientLastname}
              photoUrl={appointment.clientPhotoUrl}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <h3
                onClick={appointment.clientId ? goToClientDetail : undefined}
                className={`text-[18px] sm:text-[26px] font-bold text-white tracking-tight break-words sm:truncate ${
                  appointment.clientId ? 'cursor-pointer hover:text-[#FF5C00] transition-colors' : ''
                }`}
              >
                {appointment.clientName} {appointment.clientLastname}
              </h3>
              {clientSinceYear && (
                <p className="text-[13px] text-[#8A8A8A] mt-0.5">Cliente desde {clientSinceYear}</p>
              )}
            </div>
          </div>
          <motion.span
            key={`${appointment.id}-${appointment.status}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`self-start sm:self-auto shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium ${style.bg} ${style.text}`}
          >
            {style.label}
          </motion.span>
        </div>

        {/* Cliente */}
        <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
          <CardTitle
            action={appointment.clientKind && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${appointment.clientKind === 'Registrado' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                {appointment.clientKind === 'Registrado' ? 'Cliente registrado' : 'Cliente anónimo'}
              </span>
            )}
          >
            Cliente
          </CardTitle>
          <div className="divide-y divide-[#282828]/60">
            {appointment.clientPhone && <InfoRow icon={FiPhone}>{appointment.clientPhone}</InfoRow>}
            {appointment.clientEmail && <InfoRow icon={FiMail}>{appointment.clientEmail}</InfoRow>}
            {!appointment.clientPhone && !appointment.clientEmail && (
              <p className="text-[13px] text-[#6A6A6A] py-1">Sin datos de contacto adicionales.</p>
            )}
          </div>
          {onCreateAppointment && appointment.clientId && (
            <div className="mt-3 pt-3 border-t border-[#282828]/60">
              <Button
                variant="outline"
                size="sm"
                icon={FiCalendar}
                onClick={() => onCreateAppointment(appointment)}
                className="w-full"
              >
                Crear turno para este cliente
              </Button>
            </div>
          )}
        </div>

        {/* Turno + Pago */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
          <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
            <CardTitle>Turno</CardTitle>
            <div className="divide-y divide-[#282828]/60">
              <InfoRow icon={FiScissors}>
                {appointment.serviceName} <span className="text-[#6A6A6A]">({appointment.serviceDuration} min)</span>
              </InfoRow>
              <InfoRow icon={FiCalendar}>{formatDate(appointment.date)}</InfoRow>
              <InfoRow icon={FiClock}>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</InfoRow>
              <InfoRow icon={FiUser}>{appointment.barberName ?? appointment.barberId.slice(-6)}</InfoRow>
            </div>
            <div className="flex items-center justify-between border-t border-[#282828]/60 mt-1 pt-3">
              <span className="text-[12px] text-[#8A8A8A]">Precio</span>
              <span className="text-[19px] font-bold text-green-400">${appointment.servicePrice}</span>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
            <CardTitle>Pago</CardTitle>
            <div className="divide-y divide-[#282828]/60">
              <InfoRow icon={FiDollarSign}>{paymentBadge(appointment.paymentStatus)}</InfoRow>
              <InfoRow icon={FiCreditCard}>{methodLabel[appointment.paymentMethod] ?? appointment.paymentMethod}</InfoRow>
            </div>
            {paymentData?.payment && (
              <div className="mt-3">
                <PaymentTransactionDetail payment={paymentData.payment} />
              </div>
            )}
          </div>
        </div>

        {/* Origen */}
        <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] px-4 py-3 flex items-center justify-between gap-3">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A] shrink-0">Origen</h4>
          <div className="flex items-center gap-2 min-w-0">
            {originWithName(appointment.createdBy, creationActor)}
          </div>
        </div>

        {/* Cancelación */}
        {appointment.status === 'Cancelado' && (appointment.cancelReason || appointment.cancelledBy) && (
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/5 p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-3">Cancelación</h4>
            <div className="divide-y divide-red-500/10">
              {appointment.cancelledBy && <InfoRow icon={FiUser}>{appointment.cancelledBy}</InfoRow>}
              {appointment.cancelledAt && <InfoRow icon={FiCalendar}>{formatTimestamp(appointment.cancelledAt)}</InfoRow>}
            </div>
            {appointment.cancelReason && (
              <p className="text-[13px] text-red-400 mt-3 border-l-2 border-red-500/30 pl-3">
                {appointment.cancelReason}
              </p>
            )}
          </div>
        )}

        {/* Historial */}
        {timeline.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Historial</h4>
            <div className="relative">
              {timeline.map((entry, idx) => {
                const isLast = idx === timeline.length - 1;
                const Icon = entry.icon;
                return (
                  <div key={entry.key} className="relative pl-9 pb-5 last:pb-0">
                    {!isLast && (
                      <div className="absolute left-[13px] top-7 bottom-0 w-px bg-[#282828]" />
                    )}
                    <div className={`absolute left-0 top-0 w-7 h-7 rounded-full flex items-center justify-center ${entry.styles.bg}`}>
                      <Icon className={entry.styles.text} size={13} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[13px] font-medium text-white">{entry.label}</span>
                      <span className="text-[11px] text-[#8A8A8A]">{formatTimestamp(entry.timestamp)}</span>
                    </div>
                    <p className="text-[11px] text-[#6A6A6A] mt-0.5">
                      {entry.origin ? originWithName(entry.origin, entry.actor) : `por ${entry.actor}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
