import React, { useState } from 'react';
import { FiMoreVertical, FiCheck, FiDollarSign, FiRefreshCw, FiRepeat, FiSend, FiXCircle, FiX } from 'react-icons/fi';
import type { Appointment } from '../../../types/booking';
import type { AppointmentActions } from './useAppointmentActions';

interface AppointmentActionsMenuProps {
  appointment: Appointment;
  actions: AppointmentActions;
}

// Menú de "..." con todas las acciones operables sobre un turno Confirmado.
// Compartido entre la tabla de /admin/turnos y la vista de día del calendario.
export const AppointmentActionsMenu: React.FC<AppointmentActionsMenuProps> = ({ appointment, actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; right: number } | null>(null);

  const {
    isUpdatingStatus, isCancelling,
    setCombinedActionTarget, setRescheduleTarget, setRescheduleDate, setRescheduleTime, setRescheduleBarberId,
    setConfirmTarget, setCancelTarget, setCancelReason,
    handleSendReminder, setChangeBarberTarget, setChangeBarberNewId,
  } = actions;

  if (appointment.status !== 'Confirmado') return null;

  const isPaid = appointment.paymentStatus === 'Pagado';
  const canRegisterPayment = !isPaid && appointment.paymentMethod !== 'memberPass';
  const close = () => { setIsOpen(false); setMenuRect(null); };

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          if (isOpen) { close(); return; }
          const rect = e.currentTarget.getBoundingClientRect();
          setMenuRect({ top: rect.top, right: rect.right });
          setIsOpen(true);
        }}
        className="rounded-[8px] border border-[#282828] p-1.5 text-[#8A8A8A] hover:bg-[#1A1A1A] transition-colors"
        aria-label="Acciones del turno"
        aria-expanded={isOpen}
      >
        <FiMoreVertical className="text-sm" />
      </button>

      {isOpen && menuRect && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className="fixed z-50 w-52 rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-1 shadow-xl"
            style={{
              right: window.innerWidth - menuRect.right + 4,
              ...(menuRect.top + 300 < window.innerHeight
                ? { top: menuRect.top }
                : { bottom: window.innerHeight - menuRect.top }),
            }}
          >
            <button
              onClick={() => { setCombinedActionTarget({ appointment, primaryAction: 'Completado' }); close(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-green-400 hover:bg-[#242424] transition-colors"
            >
              <FiCheck className="text-sm" /> Completar
            </button>
            {canRegisterPayment && (
              <button
                onClick={() => { setCombinedActionTarget({ appointment, primaryAction: 'Pagado' }); close(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-emerald-400 hover:bg-[#242424] transition-colors"
              >
                <FiDollarSign className="text-sm" /> Marcar pagado
              </button>
            )}
            <button
              onClick={() => {
                setRescheduleTarget(appointment);
                setRescheduleDate(appointment.date);
                setRescheduleTime(appointment.startTime);
                setRescheduleBarberId(appointment.barberId);
                close();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-blue-400 hover:bg-[#242424] transition-colors"
            >
              <FiRefreshCw className="text-sm" /> Reprogramar
            </button>
            <button
              onClick={() => { setChangeBarberTarget(appointment); setChangeBarberNewId(''); close(); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-orange-400 hover:bg-[#242424] transition-colors"
            >
              <FiRepeat className="text-sm" /> Cambiar barbero
            </button>
            {appointment.clientEmail && (
              <button
                onClick={() => { handleSendReminder(appointment.id); close(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-cyan-400 hover:bg-[#242424] transition-colors"
              >
                <FiSend className="text-sm" /> Recordatorio
              </button>
            )}
            <button
              onClick={() => { setConfirmTarget({ id: appointment.id, action: 'NoShow' }); close(); }}
              disabled={isUpdatingStatus}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-yellow-400 hover:bg-[#242424] transition-colors disabled:opacity-50"
            >
              <FiXCircle className="text-sm" /> No asistió
            </button>
            <hr className="border-[#282828] my-1" />
            <button
              onClick={() => { setCancelTarget(appointment); setCancelReason(''); close(); }}
              disabled={isCancelling}
              className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-400 hover:bg-[#242424] transition-colors disabled:opacity-50"
            >
              <FiX className="text-sm" /> Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
};
