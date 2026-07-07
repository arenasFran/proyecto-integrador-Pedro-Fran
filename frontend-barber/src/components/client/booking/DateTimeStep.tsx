import React, { useState, useEffect } from 'react';
import { AnimatedContainer } from '../../common';
import { BookingCalendar } from './BookingCalendar';
import { TimeSlotGrid } from './TimeSlotGrid';
import { useAppDispatch } from '../../../store/hooks';
import { fetchAvailableSlots } from '../../../store/slices/bookingSlice';

interface DateTimeStepProps {
  barberId: string;
  maxAdvanceDays: number;
  selectedDate: string | null;
  selectedTime: string | null;
  availableSlots: string[];
  isLoadingSlots: boolean;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
}

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  barberId,
  maxAdvanceDays,
  selectedDate,
  selectedTime,
  availableSlots,
  isLoadingSlots,
  onSelectDate,
  onSelectTime,
}) => {
  const dispatch = useAppDispatch();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

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

  useEffect(() => {
    if (selectedDate && barberId) {
      const promise = dispatch(fetchAvailableSlots({ barberId, date: selectedDate }));
      return () => {
        promise.abort();
      };
    }
  }, [dispatch, barberId, selectedDate]);

  return (
    <AnimatedContainer animation="fadeInUp">
      <div className="p-6 space-y-5">
        <p className="text-[13px] text-[#8A8A8A]">Elegí la fecha y el horario</p>
        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <BookingCalendar
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            month={month}
            year={year}
            maxAdvanceDays={maxAdvanceDays}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />

          <TimeSlotGrid
            slots={availableSlots}
            selectedTime={selectedTime}
            selectedDate={selectedDate}
            isLoading={isLoadingSlots}
            onSelect={onSelectTime}
          />
        </div>
      </div>
    </AnimatedContainer>
  );
};
