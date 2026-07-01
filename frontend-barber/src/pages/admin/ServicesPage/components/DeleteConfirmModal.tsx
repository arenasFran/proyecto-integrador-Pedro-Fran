import { Button } from '../../../../components/common';
import type { Service } from '../../../../types/booking';

interface DeleteConfirmModalProps {
  service: Service | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({ service, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  if (service === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-[24px] border border-[#282828] bg-[#121212] p-6">
        <h3 className="text-[18px] font-bold text-white mb-2">Eliminar servicio</h3>
        <p className="text-[14px] text-[#8A8A8A] mb-6">
           ¿Estás seguro que querés eliminar &quot;{service.name}&quot;? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            loading={isDeleting}
            onClick={onConfirm}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
