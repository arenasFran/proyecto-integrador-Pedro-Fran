import React from 'react';

interface CompactDayCardProps {
  day: number;
  month: string;
  isToday: boolean;
  hasAppointments: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const monthAbbr: Record<string, string> = {
  enero: 'ene', febrero: 'feb', marzo: 'mar', abril: 'abr',
  mayo: 'may', junio: 'jun', julio: 'jul', agosto: 'ago',
  septiembre: 'sep', octubre: 'oct', noviembre: 'nov', diciembre: 'dic',
};

export const CompactDayCard: React.FC<CompactDayCardProps> = ({ day, month, isToday, hasAppointments, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center rounded-[12px] border p-2 transition-colors ${
      isSelected
        ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-white'
        : isToday
          ? 'border-[#FF5C00]/50 bg-[#1A1A1A] text-white'
          : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A]'
    }`}
  >
    <span className="text-[10px] uppercase">{monthAbbr[month] || month.slice(0, 3)}</span>
    <span className="text-[18px] font-bold leading-tight">{day}</span>
    {hasAppointments && <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-[#FF5C00]" />}
  </button>
);
