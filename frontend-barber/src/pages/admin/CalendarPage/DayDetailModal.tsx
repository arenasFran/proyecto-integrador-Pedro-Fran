import React from 'react';
import { FiClock, FiUser } from 'react-icons/fi';
import { Modal, BarberAvatar } from '../../../components/common';
import type { Appointment } from '../../../types/booking';

interface DayDetailModalProps {
  isOpen: boolean;
  date: string;
  appointments: Appointment[];
  onClose: () => void;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function parseDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const monthIndex = parseInt(parts[1], 10) - 1;
  return `${parseInt(parts[2], 10)} de ${MONTHS[monthIndex]}`;
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

export const DayDetailModal: React.FC<DayDetailModalProps> = ({ isOpen, date, appointments, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title={parseDate(date)} size="lg">
    {appointments.length === 0 ? (
      <p className="text-[14px] text-[#8A8A8A]">Sin turnos para esta fecha.</p>
    ) : (
      <div className="flex flex-col gap-3">
        {appointments.map((a) => {
          const style = statusStyles[a.status] ?? statusStyles.Confirmado;
          return (
            <div key={a.id} className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BarberAvatar
                    name={a.barberName?.split(' ')[0] ?? '?'}
                    lastname={a.barberName?.split(' ').slice(1).join(' ') ?? '?'}
                    photoUrl={a.barberPhotoUrl}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-white truncate">
                      {a.barberName ?? 'Sin barbero'}
                    </p>
                    <p className="text-[12px] text-[#8A8A8A] truncate">{a.serviceName}</p>
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
                  {style.label}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-[12px] text-[#8A8A8A]">
                <span className="flex items-center gap-1.5">
                  <FiClock className="text-[#FF5C00]" />
                  {formatTime(a.startTime)} - {formatTime(a.endTime)}
                </span>
                <span className="flex items-center gap-1.5">
                  <FiUser className="text-[#FF5C00]" />
                  {a.clientName} {a.clientLastname}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </Modal>
);
