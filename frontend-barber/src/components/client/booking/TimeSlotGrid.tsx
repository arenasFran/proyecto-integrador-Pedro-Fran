import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiClock } from 'react-icons/fi';
import type { SlotsReason } from '../../../types/professional';

const emptySlotsMessage: Record<SlotsReason, string> = {
  'day-off': 'Este día no se trabaja.',
  'already-past': 'Ya pasaron los horarios de hoy. Elegí otro día.',
  'fully-booked': 'No quedan horarios libres este día.',
};

interface TimeSlotGridProps {
  slots: string[];
  selectedTime: string | null;
  selectedDate: string | null;
  isLoading: boolean;
  error?: boolean;
  reason?: SlotsReason;
  onSelect: (time: string) => void;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  selectedTime,
  selectedDate,
  isLoading,
  error,
  reason,
  onSelect,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3">Horarios</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[38px] animate-pulse rounded-[8px] bg-[#242424]" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3">Horarios</h3>
        <div className="flex flex-col items-center gap-3 py-5">
          <FiAlertTriangle className="w-7 h-7 text-[#FF5C00]" />
          <p className="text-[13px] text-[#8A8A8A]">No pudimos cargar los horarios. Intentá de nuevo.</p>
        </div>
      </div>
    );
  }

  if (!selectedDate && slots.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3">Horarios</h3>
        <div className="flex flex-col items-center gap-3 py-5">
          <FiClock className="w-7 h-7 text-[#8A8A8A]" />
          <p className="text-[13px] text-[#8A8A8A]">Seleccioná una fecha</p>
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-5">
        <h3 className="text-[14px] font-semibold text-white mb-3">Horarios</h3>
        <div className="flex flex-col items-center gap-3 py-5">
          <FiClock className="w-7 h-7 text-[#8A8A8A]" />
          <p className="text-[13px] text-[#8A8A8A]">
            {reason ? emptySlotsMessage[reason] : 'Sin horarios disponibles'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-5">
      <h3 className="text-[14px] font-semibold text-white mb-3">
        Horarios
        <span className="ml-1.5 text-[12px] font-normal text-[#8A8A8A]">({slots.length} disponibles)</span>
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((time, index) => {
          const isSelected = selectedTime === time;
          return (
            <motion.button
              key={time}
              onClick={() => onSelect(time)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.02, duration: 0.15 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                rounded-[8px] py-2.5 px-3 text-[14px] font-medium transition-all duration-200
                ${isSelected
                  ? 'bg-[#FF5C00] text-white shadow-[0_0_10px_rgba(255,92,0,0.3)]'
                  : 'bg-[#242424] text-white hover:bg-[#2A2A2A] border border-[#282828]'
                }
              `}
            >
              {time}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
