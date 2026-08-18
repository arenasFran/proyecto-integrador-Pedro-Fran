import { AnimatedContainer, Button } from '../../../components/common';
import type { Appointment } from '../../../types/booking';

interface CombinedActionModalProps {
  target: { appointment: Appointment; primaryAction: 'Completado' | 'Pagado' } | null;
  isUpdatingStatus: boolean;
  isMarkingPaid: boolean;
  onCompleteOnly: (id: string) => Promise<void>;
  onCompleteAndPaid: (id: string) => Promise<void>;
  onMarkPaidOnly: (id: string) => Promise<void>;
  onClose: () => void;
}

export function CombinedActionModal({ target, isUpdatingStatus, isMarkingPaid, onCompleteOnly, onCompleteAndPaid, onMarkPaidOnly, onClose }: CombinedActionModalProps) {
  if (!target) return null;
  const { appointment, primaryAction } = target;
  const canRegisterPayment = appointment.paymentStatus !== 'Pagado' && appointment.paymentMethod !== 'memberPass';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
        {primaryAction === 'Completado' ? (
          <>
            <h3 className="text-[18px] font-bold text-white mb-2">Completar turno</h3>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {appointment.clientName} {appointment.clientLastname} &mdash; ¿el cliente ya pagó?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => onCompleteOnly(appointment.id)} loading={isUpdatingStatus}>
                Solo completar
              </Button>
              {canRegisterPayment && (
                <Button onClick={() => onCompleteAndPaid(appointment.id)} loading={isUpdatingStatus || isMarkingPaid} variant="secondary">
                  Completar y marcar pagado
                </Button>
              )}
              <Button variant="secondary" onClick={onClose}>Volver</Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-[18px] font-bold text-white mb-2">Registrar pago</h3>
            <p className="text-[13px] text-[#8A8A8A] mb-4">
              {appointment.clientName} {appointment.clientLastname} &mdash; ¿el servicio ya se completó?
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => onMarkPaidOnly(appointment.id)} loading={isMarkingPaid}>
                Solo marcar pagado
              </Button>
              <Button onClick={() => onCompleteAndPaid(appointment.id)} loading={isUpdatingStatus || isMarkingPaid} variant="secondary">
                Marcar pagado y completar
              </Button>
              <Button variant="secondary" onClick={onClose}>Volver</Button>
            </div>
          </>
        )}
      </AnimatedContainer>
    </div>
  );
}
