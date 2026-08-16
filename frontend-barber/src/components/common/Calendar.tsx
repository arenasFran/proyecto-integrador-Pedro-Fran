import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import type { BarberSchedule, DayKey } from '../../types/professional';

interface CalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  maxAdvanceDays: number;
  schedule?: BarberSchedule | null;
}

const DAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DAY_KEY_BY_WEEKDAY: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const dateToString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const todayString = () => dateToString(new Date());
const maxDateString = (maxAdvanceDays: number) => {
  const date = new Date();
  date.setDate(date.getDate() + maxAdvanceDays);
  return dateToString(date);
};

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onSelectDate, maxAdvanceDays, schedule }) => {
  const today = useMemo(() => new Date(), []);
  const reduceMotion = useReducedMotion();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return [...Array(startDay).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)] as (number | null)[];
  }, [month, year]);

  const buildDateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isNonWorkingDay = (dateStr: string) => {
    if (!schedule) return false;
    const daySchedule = schedule[DAY_KEY_BY_WEEKDAY[new Date(`${dateStr}T12:00:00`).getDay()]];
    return !daySchedule.startTime || !daySchedule.endTime;
  };
  const isDisabledDate = (day: number) => {
    const dateStr = buildDateStr(day);
    return dateStr < todayString() || dateStr > maxDateString(maxAdvanceDays) || isNonWorkingDay(dateStr);
  };
  const isToday = (day: number) => buildDateStr(day) === todayString();
  const isSelectedDate = (day: number) => Boolean(selectedDate && buildDateStr(day) === selectedDate);

  const canGoPrev = year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  const maxDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + maxAdvanceDays);
    return date;
  }, [maxAdvanceDays]);
  const canGoNext = year < maxDate.getFullYear() || (year === maxDate.getFullYear() && month < maxDate.getMonth());

  const moveMonth = (direction: 1 | -1) => {
    if (direction === -1 && !canGoPrev) return;
    if (direction === 1 && !canGoNext) return;
    const next = new Date(year, month + direction, 1);
    setMonth(next.getMonth());
    setYear(next.getFullYear());
  };

  const moveFocus = (day: number, offset: number) => {
    const date = new Date(year, month, day + offset);
    const dateStr = dateToString(date);
    if (date.getMonth() !== month) {
      setMonth(date.getMonth());
      setYear(date.getFullYear());
      window.setTimeout(() => dayRefs.current[dateStr]?.focus(), 30);
      return;
    }
    dayRefs.current[dateStr]?.focus();
  };

  return (
    <div className="min-h-[276px] rounded-[17px] border border-[#292929] bg-[#151515] p-5">
      <div className="mb-5 flex items-center justify-between">
        <AnimatePresence mode="wait" initial={false}><motion.span key={`${year}-${month}`} initial={reduceMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: -10 }} transition={{ duration: 0.2 }} className="text-[14px] font-semibold text-[#E5E5E5]">{MONTHS[month]} {year}</motion.span></AnimatePresence>
        <div className="flex items-center gap-1">
          <motion.button type="button" onClick={() => moveMonth(-1)} disabled={!canGoPrev} whileTap={canGoPrev && !reduceMotion ? { scale: 0.9 } : {}} aria-label="Mes anterior" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#B0B0B0] outline-none transition-colors hover:bg-[#242424] hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5C00] disabled:cursor-not-allowed disabled:text-[#414141]"><FiChevronLeft className="h-4 w-4" /></motion.button>
          <motion.button type="button" onClick={() => moveMonth(1)} disabled={!canGoNext} whileTap={canGoNext && !reduceMotion ? { scale: 0.9 } : {}} aria-label="Mes siguiente" className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#B0B0B0] outline-none transition-colors hover:bg-[#242424] hover:text-white focus-visible:ring-2 focus-visible:ring-[#FF5C00] disabled:cursor-not-allowed disabled:text-[#414141]"><FiChevronRight className="h-4 w-4" /></motion.button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => <div key={day} className="flex h-7 items-center justify-center text-[10px] font-bold tracking-[0.08em] text-[#666666]">{day}</div>)}
        {calendarDays.map((day, index) => {
          if (day === null) return <div key={`empty-${index}`} className="h-10" aria-hidden="true" />;
          const dateStr = buildDateStr(day);
          const disabled = isDisabledDate(day);
          const selected = isSelectedDate(day);
          return (
            <motion.button
              key={dateStr}
              ref={(element) => { dayRefs.current[dateStr] = element; }}
              type="button"
              onClick={() => !disabled && onSelectDate(dateStr)}
              onKeyDown={(event) => {
                const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                if (event.key in offsets) { event.preventDefault(); moveFocus(day, offsets[event.key]); }
              }}
              disabled={disabled}
              aria-label={`${day} de ${MONTHS[month]} de ${year}${isToday(day) ? ', hoy' : ''}${selected ? ', seleccionado' : ''}`}
              aria-current={isToday(day) ? 'date' : undefined}
              whileHover={!disabled && !reduceMotion ? { y: -2 } : {}}
              whileTap={!disabled && !reduceMotion ? { scale: 0.94 } : {}}
              className={`relative flex h-10 w-full items-center justify-center rounded-[11px] text-[13px] font-semibold outline-none transition-all duration-200 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[#FF5C00] ${selected ? 'bg-[#FF5C00] text-white shadow-[0_7px_18px_rgba(255,92,0,0.25)]' : disabled ? 'cursor-not-allowed text-[#383838]' : 'text-[#D6D6D6] hover:bg-[#242424]'} ${isToday(day) && !selected ? 'after:absolute after:bottom-1.5 after:h-1 after:w-1 after:rounded-full after:bg-[#FF8A4C]' : ''}`}
            >
              {day}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
