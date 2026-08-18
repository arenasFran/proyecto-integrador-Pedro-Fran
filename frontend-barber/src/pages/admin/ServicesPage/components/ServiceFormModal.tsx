import { FiX } from 'react-icons/fi';
import { AnimatedContainer, Button, Input } from '../../../../components/common';
import type { Service } from '../../../../types/booking';

type FormField = 'name' | 'description' | 'price';

interface ServiceFormModalProps {
  isOpen: boolean;
  editingService: Service | null;
  form: Record<string, string>;
  formErrors: Partial<Record<FormField, string>>;
  pageError: string | null;
  isMutating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onFieldChange: (field: FormField, value: string) => void;
}

export default function ServiceFormModal({
  isOpen,
  editingService,
  form,
  formErrors,
  pageError,
  isMutating,
  onSubmit,
  onClose,
  onFieldChange,
}: ServiceFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <AnimatedContainer animation="fadeIn" className="w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[18px] font-bold text-white">
            {editingService ? `Editar: ${editingService.name}` : 'Nuevo servicio'}
          </h3>
          <button onClick={onClose} className="text-[#8A8A8A] hover:text-white transition-colors">
            <FiX className="text-lg" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => onFieldChange('name', e.target.value)}
            error={formErrors.name}
            placeholder="Corte de pelo"
            required
          />
          <Input
            label="Descripción"
            value={form.description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            error={formErrors.description}
            placeholder="Incluye barba, cejas, lavado..."
            required
          />
          <div className="flex flex-col gap-1">
            <label className="text-[13px] text-[#8A8A8A]">Precio <span className="text-red-400">*</span></label>
            <div className="flex items-center rounded-[12px] border border-[#282828] bg-[#1A1A1A] focus-within:border-[#FF5C00]/50 transition-colors">
              <span className="pl-3 pr-2 text-[#8A8A8A] text-[14px] select-none">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.price}
                onChange={(e) => onFieldChange('price', e.target.value)}
                placeholder="490"
                required
                className="flex-1 bg-transparent py-2.5 pr-3 text-[14px] text-white placeholder-[#555] outline-none"
              />
            </div>
            {formErrors.price && <p className="text-[12px] text-red-400">{formErrors.price}</p>}
          </div>

          {pageError && (
            <p className="text-[13px] text-red-400">{pageError}</p>
          )}

          <div className="flex gap-3 mt-2">
            <Button variant="secondary" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button type="submit" loading={isMutating} disabled={isMutating}>
              {editingService ? 'Guardar cambios' : 'Crear servicio'}
            </Button>
          </div>
        </form>
      </AnimatedContainer>
    </div>
  );
}
