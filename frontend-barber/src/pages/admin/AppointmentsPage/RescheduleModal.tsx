import { AnimatedContainer, Button, DatePicker, Input, Select } from '../../../components/common';
import { formatDate } from '../../../utils/formatDate';
import { formatTime } from '../../../utils/formatTime';
import type { Appointment, Professional } from '../../../types/professional';

interface RescheduleModalProps {
  target: Appointment | null;
  date: string;
  time: string;
  barberId: string;
  isRescheduling: boolean;
  barbers: Professional[];
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onBarberChange: (barberId: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function RescheduleModal({ target, date, time, barberId, isRescheduling, barbers, onDateChange, onTimeChange, onBarberChange, onConfirm, onClose }: RescheduleModalProps) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
        <h3 className="text-[18px] font-bold text-white mb-2">Reprogramar turno</h3>
        <p className="text-[13px] text-[#8A8A8A] mb-4">
          {target.clientName} {target.clientLastname} &mdash; actual: {formatDate(target.date)} {formatTime(target.startTime)}
        </p>
        <div className="flex flex-col gap-4">
          <DatePicker label="Nueva fecha" value={date} onChange={onDateChange} />
          <Input label="Nueva hora" type="time" value={time} onChange={(e) => onTimeChange(e.target.value)} />
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
