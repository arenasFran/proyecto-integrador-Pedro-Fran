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
  slotsError?: string | null;
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
  slotsError,
  isLoadingSlots,
  onSelectDate,
  onSelectTime,
}) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (selectedDate && barberId) {
      const promise = dispatch(fetchAvailableSlots({ barberId, date: selectedDate }));
      return () => promise.abort();
    }
  }, [dispatch, barberId, selectedDate]);

  return (
    <AnimatedContainer animation="fadeIn" duration={0.3}>
      <div data-testid="datetime-step" data-barber-id={barberId} data-max-days={maxAdvanceDays} className="p-5 sm:p-6">
        <span className="sr-only" aria-hidden="true">Elegí la fecha y el horario</span>
        <div className="grid gap-3 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:items-stretch">
          <Calendar selectedDate={selectedDate} onSelectDate={onSelectDate} maxAdvanceDays={maxAdvanceDays} schedule={schedule} />
          <TimeSlotGrid slots={availableSlots} selectedTime={selectedTime} selectedDate={selectedDate} isLoading={isLoadingSlots} error={Boolean(slotsError)} reason={slotsReason} onSelect={onSelectTime} />
        </div>
      </div>
    </AnimatedContainer>
  );
};
