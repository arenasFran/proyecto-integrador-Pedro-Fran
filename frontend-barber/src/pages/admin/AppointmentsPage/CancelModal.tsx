import { AnimatedContainer, Button, Input } from '../../../components/common';
import { formatDate } from '../../../utils/formatDate';
import { formatTime } from '../../../utils/formatTime';
import type { Appointment } from '../../../types/booking';

interface CancelModalProps {
  target: Appointment | null;
  reason: string;
  isCancelling: boolean;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function CancelModal({ target, reason, isCancelling, onReasonChange, onConfirm, onClose }: CancelModalProps) {
  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
        <h3 className="text-[18px] font-bold text-white mb-2">Cancelar turno</h3>
        <p className="text-[13px] text-[#8A8A8A] mb-4">
          {target.clientName} {target.clientLastname} &mdash; {formatDate(target.date)} a las {formatTime(target.startTime)}
        </p>
        <Input
          label="Motivo de cancelación (opcional)"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Ej: El cliente no pudo asistir"
        />
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Volver
          </Button>
          <Button onClick={onConfirm} loading={isCancelling} variant="danger">
            Confirmar cancelación
          </Button>
        </div>
      </AnimatedContainer>
    </div>
  );
}
