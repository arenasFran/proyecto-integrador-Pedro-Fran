import React from 'react';
import { FiCalendar, FiClock, FiX } from 'react-icons/fi';
import { AnimatedContainer } from '../../../components/common';
import { formatDate } from '../../../utils/formatDate';
import type { Appointment } from '../../../types/booking';

interface DayDetailModalProps {
  isOpen: boolean;
  date: string;
  appointments: Appointment[];
  onClose: () => void;
}

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  Confirmado: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Confirmado' },
  Completado: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Completado' },
  Cancelado: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Cancelado' },
  NoShow: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'No asistió' },
};

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ isOpen, date, appointments, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <AnimatedContainer
        animation="fadeIn"
        className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-[24px] border border-[#282828] bg-[#121212] p-6"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-bold text-white">{formatDate(date)}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#8A8A8A] hover:bg-[#1A1A1A] transition-colors">
            <FiX className="text-lg" />
          </button>
        </div>

        {appointments.length === 0 ? (
          <p className="text-[14px] text-[#8A8A8A]">Sin turnos para esta fecha.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {appointments.map((a) => {
              const style = statusStyles[a.status] ?? statusStyles.Confirmado;
              return (
                <div key={a.id} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[14px] font-medium text-white">
                        {a.clientName} {a.clientLastname}
                      </p>
                      <p className="text-[12px] text-[#8A8A8A]">{a.serviceName}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-[12px] text-[#8A8A8A]">
                    <span className="flex items-center gap-1">
                      <FiClock className="text-[#FF5C00]" />
                      {formatTime(a.startTime)}
                    </span>
                    {a.barberName && (
                      <span className="flex items-center gap-1">
                        <FiCalendar className="text-[#FF5C00]" />
                        {a.barberName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AnimatedContainer>
    </div>
  );
};
