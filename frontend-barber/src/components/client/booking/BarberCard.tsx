import React from 'react';
import { motion } from 'framer-motion';
import { FiStar, FiCheck } from 'react-icons/fi';
import { BarberAvatar } from '../../common/BarberAvatar';
import type { BarberPublic } from '../../../types/booking';

interface BarberCardProps {
  barber: BarberPublic;
  isSelected: boolean;
  onSelect: (barber: BarberPublic) => void;
}

const stableReviews = (id: string): number => {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 20 + (hash % 60);
};

const stableRating = (id: string): string => {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rating = 4.5 + (hash % 10) * 0.05;
  return rating.toFixed(1);
};

export const BarberCard: React.FC<BarberCardProps> = ({ barber, isSelected, onSelect }) => {
  const reviews = stableReviews(barber.id);
  const rating = stableRating(barber.id);

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
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <FiStar className="w-2.5 h-2.5 text-[#FF5C00] fill-[#FF5C00]" />
            <span className="text-[12px] font-medium text-white">{rating}</span>
            <span className="text-[11px] text-[#8A8A8A]">({reviews})</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
};
