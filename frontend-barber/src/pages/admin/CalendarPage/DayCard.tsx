import React from 'react';
import { FiClock } from 'react-icons/fi';
import { BarberAvatar } from '../../../components/common';
import type { Appointment } from '../../../types/booking';

interface DayCardProps {
  date: Date;
  appointments: Appointment[];
  isToday: boolean;
  onShowMore: () => void;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

export const DayCard: React.FC<DayCardProps> = ({ date, appointments, isToday, onShowMore }) => {
  const first = appointments[0];
  const remaining = appointments.length - 1;

  return (
    <div
      className={`flex flex-col rounded-[20px] border p-5 h-[220px] lg:h-[280px] transition-colors ${
        isToday
          ? 'border-[#FF5C00]/60 bg-[#1A1A1A] ring-1 ring-[#FF5C00]/25'
          : 'border-[#282828] bg-[#121212]'
      }`}
    >
      <div className="flex items-baseline gap-1.5 mb-5">
        <span className={`text-[28px] font-bold leading-none ${isToday ? 'text-[#FF5C00]' : 'text-white'}`}>
          {date.getDate()}
        </span>
        <span className="text-[12px] text-[#505050] font-medium">
          {MONTHS[date.getMonth()]}
        </span>
      </div>

      {appointments.length === 0 ? (
  <div className="flex flex-1 items-center justify-center">
    <p className="text-[13px] text-[#505050]">Sin turnos</p>
  </div>
) : (
  <div className="flex flex-1 flex-col justify-center">
    <div className="flex flex-col items-center gap-2 rounded-[14px] border border-[#282828] bg-[#1A1A1A] px-4 py-3.5 text-center">
      <BarberAvatar
        name={first.barberName?.split(' ')[0] ?? '?'}
        lastname={first.barberName?.split(' ').slice(1).join(' ') ?? '?'}
        photoUrl={first.barberPhotoUrl}
        size="md"
      />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white leading-tight">
          {first.barberName ?? 'Sin barbero'}
        </p>
        <span className="inline-flex items-center gap-1 text-[12px] text-[#8A8A8A] mt-0.5">
          <FiClock className="text-[#FF5C00] shrink-0" size={10} />
          {formatTime(first.startTime)}
        </span>
      </div>
    </div>

    {remaining > 0 && (
      <button
        onClick={onShowMore}
        className="mt-auto text-[12px] text-[#FF5C00] font-medium hover:underline self-center px-1 cursor-pointer"
      >
        +{remaining} turno{remaining > 1 ? 's' : ''} más
      </button>
    )}
  </div>
)}
    </div>
  );
};