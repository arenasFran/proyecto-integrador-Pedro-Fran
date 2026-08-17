import React, { useMemo } from 'react';
import { FiClock, FiUser, FiScissors } from 'react-icons/fi';
import { useGetAppointmentsQuery } from '../../services/appointmentApi';
import type { AppointmentQueryParams } from '../../services/appointment.service';
import { Modal } from './Modal';
import { Spinner } from './Spinner';
import type { AppointmentStatus } from '../../types/booking';

interface AppointmentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  params: AppointmentQueryParams;
  onAppointmentClick?: (appointment: import('../../types/booking').Appointment) => void;
}

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

export const AppointmentListModal: React.FC<AppointmentListModalProps> = ({ isOpen, onClose, title, params, onAppointmentClick }) => {
  const { dateFrom, dateTo, date, ...serverFilters } = params;
  const { data: fetchedAppointments = [], isLoading, isFetching, error } = useGetAppointmentsQuery({
    ...serverFilters,
    limit: params.limit ?? 100,
  }, {
    skip: !isOpen,
  });
  const appointments = useMemo(() => fetchedAppointments.filter((appointment) => {
    const appointmentDate = appointment.date.slice(0, 10);
    return (!date || appointmentDate === date)
      && (!dateFrom || appointmentDate >= dateFrom)
      && (!dateTo || appointmentDate <= dateTo);
  }), [date, dateFrom, dateTo, fetchedAppointments]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-[#FF5C00]">No se pudieron cargar las reservas del período.</p>
      ) : appointments.length === 0 ? (
        <p className="text-[14px] text-[#8A8A8A] text-center py-8">No se encontraron turnos para este período.</p>
      ) : (
        <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
          {appointments.map((a) => {
            const style = statusStyles[a.status] ?? statusStyles.Confirmado;
            return (
              <div
                key={a.id}
                className={`rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3 flex flex-col gap-2 hover:border-[#FF5C00]/30 transition-colors ${onAppointmentClick ? 'cursor-pointer text-left w-full' : ''}`}
                onClick={() => onAppointmentClick?.(a)}
                onKeyDown={(event) => {
                  if (onAppointmentClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onAppointmentClick(a);
                  }
                }}
                role={onAppointmentClick ? 'button' : undefined}
                tabIndex={onAppointmentClick ? 0 : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-white truncate">
                      {a.clientName} {a.clientLastname}
                    </p>
                    <div className="flex items-center gap-3 text-[12px] text-[#8A8A8A] mt-1">
                      <span className="flex items-center gap-1">
                        <FiClock className="text-[10px]" />
                        {formatTime(a.startTime)} - {formatTime(a.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiUser className="text-[10px]" />
                        {a.barberName ?? 'Sin barbero'}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiScissors className="text-[10px]" />
                        {a.serviceName}
                      </span>
                    </div>
                    {a.clientEmail && (
                      <p className="text-[11px] text-[#6A6A6A] mt-0.5">{a.clientEmail}</p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                    {style.label}
                  </span>
                </div>
              </div>
            );
          })}
          {isFetching && (
            <div className="flex justify-center py-2">
              <div className="w-4 h-4 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};
