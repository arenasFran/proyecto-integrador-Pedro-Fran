import { AnimatedContainer, Button, Calendar, Select } from '../../../components/common';
import { TimeSlotGrid } from '../../../components/client/booking/TimeSlotGrid';
import { formatDate } from '../../../utils/formatDate';
import { formatTime } from '../../../utils/formatTime';
import type { Appointment } from '../../../types/booking';
import type { Professional, SlotsReason } from '../../../types/professional';

interface RescheduleModalProps {
  target: Appointment | null;
  date: string;
  time: string;
  barberId: string;
  isRescheduling: boolean;
  barbers: Professional[];
  slots: string[];
  isLoadingSlots: boolean;
  slotsError?: boolean;
  slotsReason?: SlotsReason;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onBarberChange: (barberId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function RescheduleModal({ target, date, time, barberId, isRescheduling, barbers, slots, isLoadingSlots, slotsError, slotsReason, onDateChange, onTimeChange, onBarberChange, onConfirm, onClose }: RescheduleModalProps) {
  if (!target) return null;
  const selectedBarberInfo = barbers.find((b) => b.id === barberId);
  const maxAdvanceDays = selectedBarberInfo?.maxAdvanceDays ?? 30;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
        <h3 className="text-[18px] font-bold text-white mb-2">Reprogramar turno</h3>
        <p className="text-[13px] text-[#8A8A8A] mb-4">
          {target.clientName} {target.clientLastname} &mdash; actual: {formatDate(target.date)} {formatTime(target.startTime)}
        </p>
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-medium text-[#8A8A8A] mb-1">Nueva fecha</p>
            <Calendar selectedDate={date || null} onSelectDate={onDateChange} maxAdvanceDays={maxAdvanceDays} schedule={selectedBarberInfo?.schedule} />
          </div>
          <TimeSlotGrid
            slots={slots}
            selectedTime={time}
            selectedDate={date}
            isLoading={isLoadingSlots}
            error={slotsError}
            reason={slotsReason}
            onSelect={onTimeChange}
          />
          <Select
            label="Barbero"
            value={barberId}
            onChange={onBarberChange}
            options={[
              { value: '', label: 'Seleccionar barbero' },
              ...barbers.map((b) => ({ value: b.id, label: `${b.name} ${b.lastname}` })),
            ]}
          />
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>Volver</Button>
          <Button onClick={onConfirm} loading={isRescheduling} disabled={!date || !time || !barberId}>
            Confirmar reprogramación
          </Button>
        </div>
      </AnimatedContainer>
    </div>
  );
}
