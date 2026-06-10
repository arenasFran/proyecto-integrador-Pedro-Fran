import React from 'react';
import { FiCalendar, FiEdit3, FiTrash2 } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { AnimatedContainer, Button, Input } from '../../../../../components/common';
import type { Professional } from '../../../../../types/professional';

type ProfessionalsListProps = {
  professionals: Professional[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedProfessionalId: string | null;
  onSelect: (professional: Professional) => void;
  onLoadSlots: (professionalId: string) => void;
  onDelete: (professional: Professional) => void;
  isLoading: boolean;
};

const selectedBadgeClass = (isSelected: boolean) =>
  isSelected
    ? 'border-[#FF5C00] shadow-[0_0_15px_rgba(255,92,0,0.2)]'
    : 'border-[#282828] hover:border-[#FF5C00]/50';

export const ProfessionalsList: React.FC<ProfessionalsListProps> = ({
  professionals,
  searchTerm,
  onSearchChange,
  selectedProfessionalId,
  onSelect,
  onLoadSlots,
  onDelete,
  isLoading,
}) => {
  return (
    <AnimatedContainer animation="slideInLeft" className="rounded-[24px] border border-[#282828] bg-[#121212] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-white">Empleados</h2>
          <p className="text-[13px] text-[#8A8A8A]">Seleccioná un profesional para editarlo.</p>
        </div>
        <span className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#FF5C00]">
          {professionals.length} visibles
        </span>
      </div>

      <div className="mt-4">
        <Input
          label="Buscar"
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Nombre, email, teléfono o especialidad"
          helperText="Filtrá rápido la lista antes de editar"
        />
      </div>

      <div className="mt-4 grid gap-3">
        {isLoading ? (
          <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 text-[13px] text-[#8A8A8A]">
            Cargando profesionales...
          </div>
        ) : professionals.length === 0 ? (
          <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 text-[13px] text-[#8A8A8A]">
            No hay empleados cargados todavía.
          </div>
        ) : (
          professionals.map((professional) => {
            const isSelected = selectedProfessionalId === professional.id;
            return (
              <motion.div
                key={professional.id}
                layout
                className={`rounded-[18px] border bg-[#1A1A1A] p-4 transition-all ${selectedBadgeClass(isSelected)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[16px] font-semibold text-white">
                        {professional.name} {professional.lastname}
                      </h3>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] ${professional.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#242424] text-[#8A8A8A]'}`}>
                        {professional.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-[#8A8A8A]">{professional.email}</p>
                    <p className="text-[12px] text-[#8A8A8A]">{professional.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#8A8A8A]">Slot</p>
                    <p className="text-[14px] font-semibold text-white">{professional.slotDuration} min</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {professional.specialties.slice(0, 4).map((specialty) => (
                    <span
                      key={specialty}
                      className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#8A8A8A]"
                    >
                      {specialty}
                    </span>
                  ))}
                  {professional.specialties.length === 0 && (
                    <span className="rounded-full bg-[#242424] px-3 py-1 text-[11px] text-[#8A8A8A]">
                      Sin especialidades
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" icon={FiEdit3} onClick={() => onSelect(professional)}>
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={FiCalendar}
                    onClick={() => void onLoadSlots(professional.id)}
                  >
                    Slots
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={FiTrash2}
                    onClick={() => void onDelete(professional)}
                  >
                    Eliminar
                  </Button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </AnimatedContainer>
  );
};

export default ProfessionalsList;
