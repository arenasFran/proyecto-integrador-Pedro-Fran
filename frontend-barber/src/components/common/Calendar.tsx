import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import type { BarberSchedule, DayKey } from '../../types/professional';

interface CalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  maxAdvanceDays: number;
  schedule?: BarberSchedule | null;
}

const DAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DAY_KEY_BY_WEEKDAY: DayKey[] = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

const todayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const maxDateString = (maxAdvanceDays: number) => {
  const d = new Date();
  d.setDate(d.getDate() + maxAdvanceDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const Calendar: React.FC<CalendarProps> = ({
  selectedDate,
  onSelectDate,
  maxAdvanceDays,
  schedule,
}) => {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }

    return days;
  }, [month, year]);

  const buildDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isNonWorkingDay = (dateStr: string): boolean => {
    if (!schedule) return false;
    const weekday = new Date(`${dateStr}T12:00:00`).getDay();
    const daySchedule = schedule[DAY_KEY_BY_WEEKDAY[weekday]];
    return !daySchedule.startTime || !daySchedule.endTime;
  };

  const isDisabledDate = (day: number): boolean => {
    const dateStr = buildDateStr(day);
    return dateStr < todayString() || dateStr > maxDateString(maxAdvanceDays) || isNonWorkingDay(dateStr);
  };

  const isSelectedDate = (day: number): boolean => {
    if (!selectedDate) return false;
    return buildDateStr(day) === selectedDate;
  };

  const handleSelectDay = (day: number) => {
    if (isDisabledDate(day)) return;
    onSelectDate(buildDateStr(day));
  };

  const canGoPrev = useMemo(() => {
    return year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  }, [month, year, today]);

  const canGoNext = useMemo(() => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    const maxMonth = maxDate.getMonth();
    const maxYear = maxDate.getFullYear();
    return year < maxYear || (year === maxYear && month < maxMonth);
  }, [month, year, maxAdvanceDays]);

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-5">
      <div className="flex items-center justify-between mb-4">
        <motion.button
          onClick={canGoPrev ? handlePrevMonth : undefined}
          disabled={!canGoPrev}
          whileHover={canGoPrev ? { scale: 1.1 } : {}}
          whileTap={canGoPrev ? { scale: 0.9 } : {}}
          className={`flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors
            ${canGoPrev ? 'text-white hover:bg-[#242424]' : 'text-[#8A8A8A] cursor-not-allowed'}`}
        >
          <FiChevronLeft className="w-5 h-5" />
        </motion.button>

        <span className="text-[14px] font-semibold text-white">
          {MONTHS[month]} {year}
        </span>

        <motion.button
          onClick={canGoNext ? handleNextMonth : undefined}
          disabled={!canGoNext}
          whileHover={canGoNext ? { scale: 1.1 } : {}}
          whileTap={canGoNext ? { scale: 0.9 } : {}}
          className={`flex h-9 w-9 items-center justify-center rounded-[8px] transition-colors
            ${canGoNext ? 'text-white hover:bg-[#242424]' : 'text-[#8A8A8A] cursor-not-allowed'}`}
        >
          <FiChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div key={day} className="flex items-center justify-center h-8 text-[12px] font-medium text-[#8A8A8A]">
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-10" />;
          }

          const disabled = isDisabledDate(day);
          const selected = isSelectedDate(day);

          return (
            <motion.button
              key={`day-${day}`}
              onClick={() => handleSelectDay(day)}
              disabled={disabled}
              whileHover={!disabled ? { scale: 1.1 } : {}}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              className={`
                flex h-11 w-full items-center justify-center rounded-[8px] text-[14px] font-medium transition-all duration-200
                ${selected
                  ? 'bg-[#FF5C00] text-white shadow-[0_0_10px_rgba(255,92,0,0.3)]'
                  : disabled
                    ? 'text-[#3A3A3A] cursor-not-allowed'
                    : 'text-white hover:bg-[#242424]'
                }
              `}
            >
              {day}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
