import { Button, Select } from '../../../components/common';
import { formatDate } from '../../../utils/formatDate';
import { formatTime } from '../../../utils/formatTime';
import type { Appointment, Professional } from '../../../types/professional';

interface ChangeBarberModalProps {
  target: Appointment | null;
  newBarberId: string;
  isChangingBarber: boolean;
  barbers: Professional[];
  onBarberChange: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function ChangeBarberModal({ target, newBarberId, isChangingBarber, barbers, onBarberChange, onConfirm, onClose }: ChangeBarberModalProps) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
        <h3 className="text-[18px] font-bold text-white mb-2">Cambiar barbero</h3>
        <p className="text-[13px] text-[#8A8A8A] mb-4">
          {target.clientName} {target.clientLastname} &mdash; {formatDate(target.date)} {formatTime(target.startTime)}
        </p>
        <Select
          label="Nuevo barbero"
          value={newBarberId}
          onChange={onBarberChange}
          options={[
            { value: '', label: 'Seleccionar barbero' },
            ...barbers.map((b) => ({ value: b.id, label: `${b.name} ${b.lastname}` })),
          ]}
        />
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>Volver</Button>
          <Button onClick={onConfirm} loading={isChangingBarber} disabled={!newBarberId}>
            Confirmar cambio
          </Button>
        </div>
      </div>
    </div>
  );
}
