import React from 'react';
import { FiCalendar, FiSearch, FiUser } from 'react-icons/fi';
import { AnimatedContainer, Button, Input } from '../../../../components/common';
import type { Professional } from '../../../../types/professional';

type SlotsPanelProps = {
  slotsDate: string;
  onDateChange: (value: string) => void;
  selectedProfessional: Professional | null;
  authUser: Professional | null;
  viewingAdminSlots: boolean;
  onViewSlots: () => void;
  onViewMySlots: () => void;
  slotsLoading: boolean;
  slotsError: string | null;
  availableSlots: string[];
};

export const SlotsPanel: React.FC<SlotsPanelProps> = ({
  slotsDate,
  onDateChange,
  selectedProfessional,
  authUser,
  viewingAdminSlots,
  onViewSlots,
  onViewMySlots,
  slotsLoading,
  slotsError,
  availableSlots,
}) => {
  return (
    <AnimatedContainer animation="fadeInUp" className="rounded-[24px] border border-[#282828] bg-[#121212] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-white">Slots disponibles</h2>
          <p className="text-[13px] text-[#8A8A8A]">
            Consultá la disponibilidad diaria de un profesional.
          </p>
        </div>
        <FiCalendar className="text-[#FF5C00]" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
        <Input
          label="Fecha"
          type="date"
          value={slotsDate}
          onChange={(event) => onDateChange(event.target.value)}
        />
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            icon={FiSearch}
            disabled={!selectedProfessional && !viewingAdminSlots}
            loading={slotsLoading}
            onClick={onViewSlots}
          >
            Ver slots
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={FiUser}
            loading={slotsLoading}
            onClick={onViewMySlots}
          >
            Mis slots
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-[#282828] bg-[#1A1A1A] p-4">
        <p className="text-[12px] text-[#8A8A8A]">Profesional seleccionado</p>
        <p className="mt-1 text-[15px] font-semibold text-white">
          {viewingAdminSlots && authUser
            ? `${authUser.name} ${authUser.lastname}`
            : selectedProfessional
              ? `${selectedProfessional.name} ${selectedProfessional.lastname}`
              : 'Elegí uno de la lista'}
        </p>
        <p className="text-[12px] text-[#8A8A8A]">
          {viewingAdminSlots && authUser
            ? authUser.email
            : selectedProfessional
              ? selectedProfessional.email
              : 'Sin selección'}
        </p>
      </div>

      {slotsError && (
        <p className="mt-4 text-[12px] text-red-400">{slotsError}</p>
      )}

      {availableSlots.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {availableSlots.map((slot) => (
            <div
              key={slot}
              className="rounded-[14px] border border-[#282828] bg-[#1A1A1A] px-3 py-2 text-center text-[13px] text-white"
            >
              {slot}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[18px] border border-dashed border-[#282828] bg-[#1A1A1A] p-4 text-[13px] text-[#8A8A8A]">
          {slotsLoading
            ? 'Buscando slots...'
            : 'Todavía no cargaste slots para esta fecha.'}
        </div>
      )}
    </AnimatedContainer>
  );
};

export default SlotsPanel;
