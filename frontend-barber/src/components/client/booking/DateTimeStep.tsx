import React, { useEffect } from 'react';
import { AnimatedContainer, Calendar } from '../../common';
import { TimeSlotGrid } from './TimeSlotGrid';
import { useAppDispatch } from '../../../store/hooks';
import { fetchAvailableSlots } from '../../../store/slices/bookingSlice';
import type { BarberSchedule, SlotsReason } from '../../../types/professional';

interface DateTimeStepProps {
  barberId: string;
  maxAdvanceDays: number;
  schedule?: BarberSchedule;
  selectedDate: string | null;
  selectedTime: string | null;
  availableSlots: string[];
  slotsReason?: SlotsReason;
  isLoadingSlots: boolean;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
}

export const DateTimeStep: React.FC<DateTimeStepProps> = ({
  barberId,
  maxAdvanceDays,
  schedule,
  selectedDate,
  selectedTime,
  availableSlots,
  slotsReason,
  isLoadingSlots,
  onSelectDate,
  onSelectTime,
}) => {
  const dispatch = useAppDispatch();

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
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            maxAdvanceDays={maxAdvanceDays}
            schedule={schedule}
          />

          <TimeSlotGrid
            slots={availableSlots}
            selectedTime={selectedTime}
            selectedDate={selectedDate}
            isLoading={isLoadingSlots}
            reason={slotsReason}
            onSelect={onSelectTime}
          />
        </div>
      </div>
    </AnimatedContainer>
  );
};
