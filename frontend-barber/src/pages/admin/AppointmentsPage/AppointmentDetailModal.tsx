import React from 'react';
import { motion } from 'framer-motion';
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
  FiCopy,
  FiSend,
  FiRefreshCw,
  FiRepeat,
} from 'react-icons/fi';
import { Modal, Button, Spinner } from '../../../components/common';
import type { Appointment, AppointmentStatus, CreatedBy } from '../../../types/booking';
import { formatDate } from '../../../utils/formatDate';

const statusStyles: Record<AppointmentStatus, { bg: string; text: string; label: string }> = {
  Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Confirmado' },
  Completado: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completado' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
  NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'No asistió' },
};

const statusLabel: Record<string, string> = {
  Confirmado: 'Confirmado', Completado: 'Completado', Cancelado: 'Cancelado', NoShow: 'No asistió',
};

const methodLabel: Record<string, string> = { local: 'Local', online: 'Online', memberPass: 'Membresía' };

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function originBadge(cb?: CreatedBy) {
  if (!cb) return <span className="text-[12px] text-[#8A8A8A]">—</span>;
  const config: Record<string, { label: string; color: string }> = {
    staff: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400' },
    registered: { label: 'Online', color: 'bg-blue-500/10 text-blue-400' },
    anonymous: { label: 'Invitado', color: 'bg-gray-500/10 text-gray-400' },
  };
  const c = config[cb.type] ?? { label: cb.type, color: 'bg-gray-500/10 text-gray-400' };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${c.color}`}>{c.label}</span>;
}

function paymentBadge(ps: Appointment['paymentStatus']) {
  const isPaid = ps === 'Pagado';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${isPaid ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
      {isPaid ? 'Pagado' : 'Pendiente'}
    </span>
  );
}

interface AppointmentDetailModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (appointment: Appointment) => void;
  onNoShow: (id: string) => void;
  onCancel: (appointment: Appointment) => void;
  onReschedule: (appointment: Appointment) => void;
  onMarkAsPaid: (appointment: Appointment) => void;
  onDuplicate: (appointment: Appointment) => void;
  onSendReminder: (id: string) => void;
  onChangeBarber: (appointment: Appointment) => void;
  isCompleting: boolean;
  isMarkingNoShow: boolean;
  isMarkingPaid: boolean;
  isSendingReminder: boolean;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onComplete,
  onNoShow,
  onCancel,
  onReschedule,
  onMarkAsPaid,
  onDuplicate,
  onSendReminder,
  onChangeBarber,
  isCompleting,
  isMarkingNoShow,
  isMarkingPaid,
  isSendingReminder,
}) => {
  if (!appointment) return null;

  const style = statusStyles[appointment.status];
  const isActive = appointment.status === 'Confirmado';
  const isPaid = appointment.paymentStatus === 'Pagado';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del turno" size="xl">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-[20px] font-bold text-white truncate">
              {appointment.clientName} {appointment.clientLastname}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {originBadge(appointment.createdBy)}
              {appointment.clientKind && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${appointment.clientKind === 'Registrado' ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-500/10 text-gray-400'}`}>
                  {appointment.clientKind === 'Registrado' ? 'Cliente registrado' : 'Cliente anónimo'}
                </span>
              )}
            </div>
          </div>
          <motion.span
            key={`${appointment.id}-${appointment.status}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-medium ${style.bg} ${style.text}`}
          >
            {style.label}
          </motion.span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Cliente</h4>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2 text-[#8A8A8A]">
                <FiUser className="shrink-0 text-[#FF5C00]" size={14} />
                <span className="text-white">{appointment.clientName} {appointment.clientLastname}</span>
              </div>
              {appointment.clientEmail && (
                <div className="flex items-center gap-2 text-[#8A8A8A]">
                  <FiMail className="shrink-0 text-[#FF5C00]" size={14} />
                  <span>{appointment.clientEmail}</span>
                </div>
              )}
              {appointment.clientPhone && (
                <div className="flex items-center gap-2 text-[#8A8A8A]">
                  <FiPhone className="shrink-0 text-[#FF5C00]" size={14} />
                  <span>{appointment.clientPhone}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Turno</h4>
            <div className="space-y-2 text-[13px]">
              <div className="flex items-center gap-2 text-[#8A8A8A]">
                <FiScissors className="shrink-0 text-[#FF5C00]" size={14} />
                <span className="text-white">{appointment.serviceName}</span>
                <span className="text-[#6A6A6A]">({appointment.serviceDuration} min)</span>
              </div>
              <div className="flex items-center gap-2 text-[#8A8A8A]">
                <FiCalendar className="shrink-0 text-[#FF5C00]" size={14} />
                <span className="text-white">{formatDate(appointment.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-[#8A8A8A]">
                <FiClock className="shrink-0 text-[#FF5C00]" size={14} />
                <span className="text-white">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
              </div>
              <div className="flex items-center gap-2 text-[#8A8A8A]">
                <FiUser className="shrink-0 text-[#FF5C00]" size={14} />
                <span className="text-white">{appointment.barberName ?? appointment.barberId.slice(-6)}</span>
              </div>
              <div className="flex items-center gap-2 text-[#8A8A8A]">
                <FiDollarSign className="shrink-0 text-[#FF5C00]" size={14} />
                <span className="text-white">${appointment.servicePrice}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3 rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Pago</h4>
            <div className="flex items-center gap-2">
              {paymentBadge(appointment.paymentStatus)}
              <span className="text-[13px] text-[#8A8A8A]">{methodLabel[appointment.paymentMethod] ?? appointment.paymentMethod}</span>
            </div>
            {isActive && !isPaid && (
              <button
                onClick={() => onMarkAsPaid(appointment)}
                disabled={isMarkingPaid}
                className="flex items-center gap-1.5 rounded-[8px] border border-green-500/30 px-3 py-1.5 text-[12px] text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 mt-2"
              >
                {isMarkingPaid ? <Spinner size="sm" /> : <FiCheck className="text-sm" />}
                Marcar pagado
              </button>
            )}
          </div>

          <div className="space-y-3 rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Origen</h4>
            <div className="flex items-center gap-2">
              {originBadge(appointment.createdBy)}
            </div>
            {appointment.createdBy?.userId && (
              <p className="text-[12px] text-[#8A8A8A]">ID: {appointment.createdBy.userId}</p>
            )}
          </div>
        </div>

        {appointment.status === 'Cancelado' && (appointment.cancelReason || appointment.cancelledBy) && (
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/5 p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A] mb-2">Cancelación</h4>
            {appointment.cancelledBy && <p className="text-[13px] text-white">Por: {appointment.cancelledBy}</p>}
            {appointment.cancelledAt && <p className="text-[12px] text-[#8A8A8A]">{formatTimestamp(appointment.cancelledAt)}</p>}
            {appointment.cancelReason && <p className="text-[12px] text-red-400 mt-1">Motivo: {appointment.cancelReason}</p>}
          </div>
        )}

        {appointment.statusHistory && appointment.statusHistory.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Historial de cambios</h4>
            <div className="relative pl-6 space-y-0">
              {appointment.statusHistory.map((entry, idx) => {
                const isLast = idx === appointment.statusHistory!.length - 1;
                const st = statusStyles[entry.status];
                return (
                  <div key={idx} className="relative pb-4 last:pb-0">
                    {!isLast && (
                      <div className="absolute left-0 top-3 bottom-0 w-px bg-[#282828]" />
                    )}
                    <div className="absolute left-[-5px] top-[6px] w-[10px] h-[10px] rounded-full border-2 border-[#282828] bg-[#121212]"
                      style={{ borderColor: st?.text?.replace('text-', '') === 'green-400' ? '#4ade80' : st?.text?.replace('text-', '') === 'blue-400' ? '#60a5fa' : st?.text?.replace('text-', '') === 'red-400' ? '#f87171' : st?.text?.replace('text-', '') === 'yellow-400' ? '#fbbf24' : '#282828' }}
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${st?.bg ?? ''} ${st?.text ?? ''}`}>
                        {statusLabel[entry.status] ?? entry.status}
                      </span>
                      <span className="text-[11px] text-[#8A8A8A]">
                        {(() => {
                          try { return formatTimestamp(entry.timestamp); } catch { return entry.timestamp; }
                        })()}
                      </span>
                      <span className="text-[11px] text-[#6A6A6A]">por {entry.actor}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isActive && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-[#282828]">
            <button
                onClick={() => onComplete(appointment)}
                disabled={isCompleting}
                className="flex items-center gap-1.5 rounded-[10px] border border-green-500/30 px-3 py-2 text-[12px] font-medium text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
              >
                {isCompleting ? <Spinner size="sm" /> : <FiCheck className="text-sm" />}
                Completar
              </button>
            <button
              onClick={() => onNoShow(appointment.id)}
              disabled={isMarkingNoShow}
              className="flex items-center gap-1.5 rounded-[10px] border border-yellow-500/30 px-3 py-2 text-[12px] font-medium text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
            >
              {isMarkingNoShow ? <Spinner size="sm" /> : <FiXCircle className="text-sm" />}
              No asistió
            </button>
            <button
              onClick={() => onReschedule(appointment)}
              className="flex items-center gap-1.5 rounded-[10px] border border-blue-500/30 px-3 py-2 text-[12px] font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
            >
              <FiRefreshCw className="text-sm" />
              Reprogramar
            </button>
            <button
              onClick={() => onCancel(appointment)}
              className="flex items-center gap-1.5 rounded-[10px] border border-red-500/30 px-3 py-2 text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <FiX className="text-sm" />
              Cancelar
            </button>
            <button
              onClick={() => onDuplicate(appointment)}
              className="flex items-center gap-1.5 rounded-[10px] border border-purple-500/30 px-3 py-2 text-[12px] font-medium text-purple-400 hover:bg-purple-500/10 transition-colors"
            >
              <FiCopy className="text-sm" />
              Duplicar
            </button>
            {appointment.clientEmail && (
              <button
                onClick={() => onSendReminder(appointment.id)}
                disabled={isSendingReminder}
                className="flex items-center gap-1.5 rounded-[10px] border border-cyan-500/30 px-3 py-2 text-[12px] font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50"
              >
                {isSendingReminder ? <Spinner size="sm" /> : <FiSend className="text-sm" />}
                Recordatorio
              </button>
            )}
            <button
              onClick={() => onChangeBarber(appointment)}
              className="flex items-center gap-1.5 rounded-[10px] border border-orange-500/30 px-3 py-2 text-[12px] font-medium text-orange-400 hover:bg-orange-500/10 transition-colors"
            >
              <FiRepeat className="text-sm" />
              Cambiar barbero
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
