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


export const BarberCard: React.FC<BarberCardProps> = ({ barber, isSelected, onSelect }) => {
  // Removed synthetic reviews/rating — show only real data when available.

  return (
    <motion.button
      onClick={() => onSelect(barber)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full rounded-[12px] border bg-[#1A1A1A] p-5 text-center transition-all duration-200 overflow-hidden
        ${isSelected
          ? 'border-[#FF5C00] shadow-[0_0_12px_rgba(255,92,0,0.15)]'
          : 'border-[#282828] hover:border-[#FF5C00]/50'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5C00]">
          <FiCheck className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <BarberAvatar
          name={barber.name}
          lastname={barber.lastname}
          photoUrl={barber.photoUrl}
          size="2xl"
        />

        <div className="min-w-0 w-full">
          <h3 className="text-[14px] font-semibold text-white leading-tight">
            <span className="block">{barber.name}</span>
            <span className="block">{barber.lastname}</span>
          </h3>
          {/* Rating removed to avoid displaying synthetic data */}
        </div>
      </div>
    </motion.button>
  );
};
