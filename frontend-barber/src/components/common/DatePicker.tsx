import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { formatDate } from '../../utils/formatDate';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const DAY_LABELS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTH_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, className }) => {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value]);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  const calYear = viewDate.getFullYear();
  const calMonth = viewDate.getMonth();
  const calDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calStartDay = new Date(calYear, calMonth, 1).getDay();
  const calDays: (number | null)[] = [];
  for (let i = 0; i < calStartDay; i++) calDays.push(null);
  for (let d = 1; d <= calDaysInMonth; d++) calDays.push(d);
  const todayStr = new Date().toISOString().slice(0, 10);

  const handleDayClick = (day: number) => {
    const newDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(newDate);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className || ''}`}>
      {label && (
        <label className="block text-[13px] font-medium text-[#8A8A8A] mb-1">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex items-center gap-1.5 rounded-[10px] border border-[#282828] px-3 py-1.5 text-[13px] text-[#FF5C00] hover:border-[#FF5C00]/50 transition-colors cursor-pointer"
      >
        <FiCalendar className="text-sm" />
        {formatDate(value)}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-[60] w-[260px] rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-3 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate(new Date(calYear, calMonth - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#8A8A8A] hover:text-white hover:bg-[#282828] transition-colors text-sm"
            >
              &#8249;
            </button>
            <span className="text-[13px] font-semibold text-white">
              {MONTH_LABELS[calMonth]} {calYear}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(calYear, calMonth + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#8A8A8A] hover:text-white hover:bg-[#282828] transition-colors text-sm"
            >
              &#8250;
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {DAY_LABELS.map((l) => (
              <span key={l} className="text-[11px] font-medium text-[#8A8A8A] py-1">{l}</span>
            ))}
            {calDays.map((d, i) => {
              if (d === null) return <div key={`e-${i}`} />;
              const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => handleDayClick(d)}
                  className={`flex h-8 w-8 items-center justify-center rounded-[8px] text-[13px] transition-colors mx-auto ${
                    isSelected ? 'bg-[#FF5C00] text-white font-bold' : isToday ? 'text-[#FF5C00] font-semibold' : 'text-[#D1D1D1] hover:bg-[#282828]'
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
