import React, { useEffect, useRef, useState } from 'react';
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
const MAX_VISIBLE_APPOINTMENTS = 4;

function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}

function formatHour(time: string) {
  return time.slice(0, 2);
}

export const DayCard: React.FC<DayCardProps> = ({ date, appointments, blocks, isToday, onShowMore, onCreateTurno, onCreateBlock }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(1);
  const [roomy, setRoomy] = useState(false);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const measure = () => {
      const matches = (query: string) =>
        typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
      if (matches('(min-width: 1536px)') || !matches('(min-width: 1024px)')) {
        setVisibleCount(1);
        setRoomy(false);
        return;
      }

      const height = el.clientHeight;
      const rowGap = 4;
      const countCompact = Math.max(1, Math.min(MAX_VISIBLE_APPOINTMENTS, Math.floor((height - 95 + rowGap) / (34 + rowGap))));
      const countRoomy = Math.max(1, Math.min(MAX_VISIBLE_APPOINTMENTS, Math.floor((height - 101 + rowGap) / (46 + rowGap))));
      const useRoomy = height >= 190 && countRoomy >= countCompact;

      setVisibleCount(useRoomy ? countRoomy : countCompact);
      setRoomy(useRoomy);
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    const mediaQuery = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1536px)') : null;
    mediaQuery?.addEventListener('change', measure);

    return () => {
      observer.disconnect();
      mediaQuery?.removeEventListener('change', measure);
    };
  }, []);

  const shown = appointments.slice(0, visibleCount);
  const remaining = appointments.length - shown.length;

  return (
    <div
      ref={cardRef}
      className={`flex h-full min-h-[148px] flex-col overflow-hidden rounded-[14px] border transition-colors ${roomy ? 'p-3.5' : 'p-3'} 2xl:h-[320px] 2xl:overflow-visible 2xl:rounded-[20px] 2xl:p-5 ${
        isToday
          ? 'border-[#FF5C00]/60 bg-[#1A1A1A] ring-1 ring-[#FF5C00]/25'
          : 'border-[#282828] bg-[#121212]'
      }`}
    >
      <div className={`flex items-center justify-between gap-1 ${roomy ? 'mb-2.5' : 'mb-2'} 2xl:mb-4 2xl:items-start 2xl:gap-0`}>
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className={`w-auto shrink-0 text-[22px] font-bold leading-none 2xl:w-[36px] 2xl:text-[28px] ${isToday ? 'text-[#FF5C00]' : 'text-white'}`}>
            {date.getDate()}
          </span>
          <span className="hidden whitespace-nowrap text-[12px] font-medium text-[#505050] 2xl:inline">
            {MONTHS[date.getMonth()]}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1 2xl:pl-3">
          {onCreateBlock && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateBlock();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] transition-colors hover:border-[#FF5C00] hover:text-[#FF5C00] cursor-pointer"
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
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] transition-colors hover:border-[#FF5C00] hover:text-[#FF5C00] cursor-pointer"
              aria-label="Crear turno"
            >
              <FiPlus size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 2xl:gap-1.5">
        {blocks.length > 0 ? (
          <div
            onClick={onShowMore}
            title={`${blocks[0].startTime} - ${blocks[0].endTime}${blocks.length > 1 ? ` (+${blocks.length - 1})` : ''}`}
            className="flex shrink-0 items-center justify-center gap-1 rounded-[6px] border border-dashed border-[#505050]/60 bg-[#1A1A1A]/30 px-1 py-0.5 cursor-pointer 2xl:gap-1.5 2xl:rounded-[8px] 2xl:px-2 2xl:py-1"
          >
            <FiLock size={9} className="shrink-0 text-[#8A8A8A]" />
            <span className="whitespace-nowrap text-[10px] text-[#8A8A8A] 2xl:hidden">
              {formatHour(blocks[0].startTime)}-{formatHour(blocks[0].endTime)}
              {blocks.length > 1 ? ` (+${blocks.length - 1})` : ''}
            </span>
            <span className="hidden whitespace-nowrap text-[11px] text-[#8A8A8A] 2xl:inline">
              {blocks[0].startTime} - {blocks[0].endTime} {blocks.length > 1 ? `(+${blocks.length - 1})` : ''}
            </span>
          </div>
        ) : (
          <div className="h-[18px] shrink-0 2xl:h-[26px]" />
        )}

        {appointments.length === 0 ? (
          blocks.length === 0 && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-[11px] text-[#505050] 2xl:text-[13px]">Sin turnos</p>
            </div>
          )
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            {shown.map((appointment) => (
              <button
                key={appointment.id}
                type="button"
                onClick={onShowMore}
                className={`flex w-full min-w-0 flex-row items-center rounded-[6px] border border-[#282828] bg-[#1A1A1A] text-left transition-colors hover:border-[#FF5C00]/50 cursor-pointer 2xl:flex-col 2xl:items-center 2xl:gap-2 2xl:rounded-[14px] 2xl:px-4 2xl:py-3.5 2xl:text-center ${
                  roomy ? 'gap-2 px-2 py-1.5' : 'gap-1.5 px-1.5 py-1'
                }`}
              >
                <span className="shrink-0 2xl:hidden">
                  <BarberAvatar
                    name={appointment.barberName?.split(' ')[0] ?? '?'}
                    lastname={appointment.barberName?.split(' ').slice(1).join(' ') ?? '?'}
                    photoUrl={appointment.barberPhotoUrl}
                    size={roomy ? 'sm' : 'xs'}
                  />
                </span>
                <span className="hidden shrink-0 2xl:block">
                  <BarberAvatar
                    name={appointment.barberName?.split(' ')[0] ?? '?'}
                    lastname={appointment.barberName?.split(' ').slice(1).join(' ') ?? '?'}
                    photoUrl={appointment.barberPhotoUrl}
                    size="md"
                  />
                </span>
                <div className="min-w-0 flex-1 2xl:w-full 2xl:flex-none">
                  <p className={`truncate font-semibold leading-tight text-white 2xl:overflow-visible 2xl:whitespace-normal 2xl:text-[13px] ${roomy ? 'text-[11px]' : 'text-[10px]'}`}>
                    {appointment.barberName ?? 'Sin barbero'}
                  </p>
                  <span className={`mt-0.5 flex items-center gap-0.5 text-[#8A8A8A] 2xl:justify-center 2xl:gap-1 2xl:text-[12px] ${roomy ? 'text-[10px]' : 'text-[9px]'}`}>
                    <FiClock className="shrink-0 text-[#FF5C00]" size={10} />
                    {formatTime(appointment.startTime)}
                  </span>
                </div>
              </button>
            ))}

            {remaining > 0 && (
              <button
                onClick={onShowMore}
                className={`mt-1 shrink-0 cursor-pointer self-center whitespace-nowrap px-1 pb-0.5 font-medium text-[#FF5C00] hover:underline 2xl:mt-auto 2xl:text-[12px] ${roomy ? 'text-[11px]' : 'text-[10px]'}`}
              >
                <span className="2xl:hidden">+{remaining} más</span>
                <span className="hidden 2xl:inline">
                  +{remaining} turno{remaining > 1 ? 's' : ''} más
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
