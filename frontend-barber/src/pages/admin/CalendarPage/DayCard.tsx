import React from 'react';
import { FiClock, FiLock, FiPlus } from 'react-icons/fi';
import { BarberAvatar } from '../../../components/common';
import type { Appointment, BarberBlock } from '../../../types/booking';

interface DayCardProps {
  date: Date;
  appointments: Appointment[];
  blocks: BarberBlock[];
  isToday: boolean;
  onShowMore: () => void;
  onCreateTurno?: () => void;
  onCreateBlock?: () => void;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

export const DayCard: React.FC<DayCardProps> = ({ date, appointments, blocks, isToday, onShowMore, onCreateTurno, onCreateBlock }) => {
  const first = appointments[0];
  const remaining = appointments.length - 1;

  return (
    <div
      className={`flex flex-col rounded-[20px] border p-5 h-[260px] lg:h-[320px] transition-colors ${
        isToday
          ? 'border-[#FF5C00]/60 bg-[#1A1A1A] ring-1 ring-[#FF5C00]/25'
          : 'border-[#282828] bg-[#121212]'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-[28px] font-bold leading-none w-[36px] shrink-0 ${isToday ? 'text-[#FF5C00]' : 'text-white'}`}>
            {date.getDate()}
          </span>
          <span className="text-[12px] text-[#505050] font-medium whitespace-nowrap">
            {MONTHS[date.getMonth()]}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0 pl-3">
          {onCreateBlock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateBlock();
              }}
              className="flex items-center justify-center w-6 h-6 rounded-full border border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:text-[#FF5C00] hover:border-[#FF5C00] transition-colors cursor-pointer"
              aria-label="Bloquear horario"
            >
              <FiLock size={11} />
            </button>
          )}
          {onCreateTurno && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateTurno();
              }}
              className="flex items-center justify-center w-6 h-6 rounded-full border border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:text-[#FF5C00] hover:border-[#FF5C00] transition-colors cursor-pointer"
              aria-label="Crear turno"
            >
              <FiPlus size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        {blocks.length > 0 ? (
          <div
            onClick={onShowMore}
            className="flex items-center justify-center gap-1.5 rounded-[8px] border border-dashed border-[#505050]/60 bg-[#1A1A1A]/30 px-2 py-1 cursor-pointer"
          >
            <FiLock size={9} className="text-[#8A8A8A] shrink-0" />
            <span className="text-[11px] text-[#8A8A8A]">
              {blocks[0].startTime} - {blocks[0].endTime} {blocks.length > 1 ? `(+${blocks.length - 1})` : ''}
            </span>
          </div>
        ) : (
          <div className="h-[26px]" />
        )}

        {appointments.length === 0 ? (
          blocks.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[13px] text-[#505050]">Sin turnos</p>
            </div>
          )
        ) : (
          <div className="flex flex-1 flex-col">
            <button
              type="button"
              onClick={onShowMore}
              className="flex flex-col items-center gap-2 rounded-[14px] border border-[#282828] bg-[#1A1A1A] px-4 py-3.5 text-center cursor-pointer hover:border-[#FF5C00]/50 transition-colors"
            >
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
            </button>

            {remaining > 0 && (
              <button
                onClick={onShowMore}
                
                className="mt-auto text-[12px] text-[#FF5C00] font-medium hover:underline self-center px-1 pb-0.5 cursor-pointer"
              >
                +{remaining} turno{remaining > 1 ? 's' : ''} más
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
