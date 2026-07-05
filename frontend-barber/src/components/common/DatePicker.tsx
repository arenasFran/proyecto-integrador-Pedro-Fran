import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { formatDate } from '../../utils/formatDate';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const DAY_LABELS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
const MONTH_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label, className, open: controlledOpen, onOpenChange }) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpenRef = useRef<(v: boolean | ((prev: boolean) => boolean)) => void>(() => {});
  const setOpen = (v: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof v === 'function' ? v(open) : v;
    if (onOpenChange) onOpenChange(next);
    if (controlledOpen === undefined) setInternalOpen(next);
  };
  useEffect(() => { setOpenRef.current = setOpen; });
  const [monthOffset, setMonthOffset] = useState(0);
  const viewDate = useMemo(() => {
    const base = value ? new Date(value + 'T12:00:00') : new Date();
    return new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  }, [value, monthOffset]);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpenRef.current(false);
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
    setMonthOffset(0);
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
              onClick={() => setMonthOffset(o => o - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#8A8A8A] hover:text-white hover:bg-[#282828] transition-colors text-sm"
            >
              &#8249;
            </button>
            <span className="text-[13px] font-semibold text-white">
              {MONTH_LABELS[calMonth]} {calYear}
            </span>
            <button
              type="button"
              onClick={() => setMonthOffset(o => o + 1)}
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
