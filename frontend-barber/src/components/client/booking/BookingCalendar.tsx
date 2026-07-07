import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface BookingCalendarProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  month: number;
  year: number;
  maxAdvanceDays: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const DAYS = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
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

export const BookingCalendar: React.FC<BookingCalendarProps> = ({
  selectedDate,
  onSelectDate,
  month,
  year,
  maxAdvanceDays,
  onPrevMonth,
  onNextMonth,
}) => {
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

  const isPastDate = (day: number): boolean => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr < todayString() || dateStr > maxDateString(maxAdvanceDays);
  };

  const isSelectedDate = (day: number): boolean => {
    if (!selectedDate) return false;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return dateStr === selectedDate;
  };

  const handleSelectDay = (day: number) => {
    if (isPastDate(day)) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onSelectDate(dateStr);
  };

  const canGoPrev = useMemo(() => {
    const today = new Date();
    return year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth());
  }, [month, year]);

  const canGoNext = useMemo(() => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    const maxMonth = maxDate.getMonth();
    const maxYear = maxDate.getFullYear();
    return year < maxYear || (year === maxYear && month < maxMonth);
  }, [month, year, maxAdvanceDays]);

  return (
    <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-5">
      <div className="flex items-center justify-between mb-4">
        <motion.button
          onClick={canGoPrev ? onPrevMonth : undefined}
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
          onClick={canGoNext ? onNextMonth : undefined}
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

          const disabled = isPastDate(day);
          const selected = isSelectedDate(day);

          return (
            <motion.button
              key={`day-${day}`}
              onClick={() => !disabled && handleSelectDay(day)}
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
