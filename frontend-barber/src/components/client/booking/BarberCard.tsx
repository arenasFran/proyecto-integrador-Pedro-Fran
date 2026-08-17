import { motion } from 'framer-motion';
import React from 'react';
import { FiCheck } from 'react-icons/fi';
import type { BarberPublic } from '../../../types/booking';
import { BarberAvatar } from '../../common/BarberAvatar';

interface BarberCardProps {
  barber: BarberPublic;
  isSelected: boolean;
  onSelect: (barber: BarberPublic) => void;
}

export const BarberCard: React.FC<BarberCardProps> = ({ barber, isSelected, onSelect }) => (
  <motion.button
    onClick={() => onSelect(barber)}
    type="button"
    aria-pressed={isSelected}
    aria-label={`Elegir a ${barber.name} ${barber.lastname}`}
    whileHover={{ y: -4 }}
    whileTap={{ scale: 0.985 }}
    className={`group relative w-full overflow-hidden rounded-[18px] border bg-[#151515] p-4 text-left outline-none transition-[border-color,background-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-[#FF5C00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] ${
      isSelected
        ? 'border-[#FF5C00] bg-[#1B1714] shadow-[0_16px_35px_rgba(255,92,0,0.12)]'
        : 'border-[#292929] hover:border-[#FF5C00]/60 hover:bg-[#191919]'
    }`}
  >
    <div className={`pointer-events-none absolute inset-x-0 top-0 h-px transition-colors ${isSelected ? 'bg-[#FF5C00]' : 'bg-white/[0.06] group-hover:bg-[#FF5C00]/50'}`} />
    <span className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border transition-all duration-300 ${isSelected ? 'border-[#FF5C00] bg-[#FF5C00] text-white shadow-[0_4px_14px_rgba(255,92,0,0.3)]' : 'border-[#4A4A4A] bg-[#202020] text-transparent group-hover:border-[#FF5C00]/70'}`}>
      {isSelected && <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }}><FiCheck className="h-3 w-3" /></motion.span>}
    </span>

    <div className="flex flex-col items-center gap-4 py-2">
      <BarberAvatar name={barber.name} lastname={barber.lastname} photoUrl={barber.photoUrl} size="xl" />
      <div className="w-full min-w-0 text-center">
        <h3 className="text-[15px] font-semibold leading-tight text-white">
          <span className="block">{barber.name}</span>
          <span className="block">{barber.lastname}</span>
        </h3>
        {barber.services.length > 0 && <p className="mt-2 line-clamp-1 text-[11px] text-[#777]">{barber.services.join(' · ')}</p>}
      </div>
    </div>
  </motion.button>
);
