import React from 'react';
import { FiCalendar } from 'react-icons/fi';

interface DayCardProps {
  day: number;
  month: string;
  weekday: string;
  isToday: boolean;
  isSelected: boolean;
  appointmentCount: number;
  onClick: () => void;
}

export const DayCard: React.FC<DayCardProps> = ({ day, month, weekday, isToday, isSelected, appointmentCount, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center rounded-[16px] border p-4 transition-all hover:scale-[1.02] ${
      isSelected
        ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-white'
        : isToday
          ? 'border-[#FF5C00]/50 bg-[#1A1A1A] text-white'
          : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A]'
    }`}
  >
    <span className="text-[11px] uppercase text-[#8A8A8A]">{weekday}</span>
    <span className="text-[28px] font-bold leading-tight text-white">{day}</span>
    <span className="text-[11px] text-[#8A8A8A] capitalize">{month}</span>
    {appointmentCount > 0 && (
      <span className="mt-2 flex items-center gap-1 rounded-full bg-[#FF5C00]/20 px-2 py-0.5 text-[11px] text-[#FF5C00]">
        <FiCalendar className="text-[10px]" />
        {appointmentCount}
      </span>
    )}
  </button>
);
