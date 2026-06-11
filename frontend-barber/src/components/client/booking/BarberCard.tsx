import React from 'react';
import { motion } from 'framer-motion';
import { FiStar, FiUser, FiCheck } from 'react-icons/fi';
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
  const fullName = `${barber.name} ${barber.lastname}`;
  const service = barber.services[0] ?? 'Barbero';
  const reviews = stableReviews(barber.id);
  const rating = stableRating(barber.id);

  return (
    <motion.button
      onClick={() => onSelect(barber)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full rounded-[16px] border bg-[#1A1A1A] p-4 text-left transition-all duration-300
        ${isSelected
          ? 'border-[#FF5C00] shadow-[0_0_15px_rgba(255,92,0,0.2)]'
          : 'border-[#282828] hover:border-[#FF5C00]/50'
        }
      `}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#FF5C00]">
          <FiCheck className="w-3.5 h-3.5 text-white" />
        </div>
      )}

      <div className="flex flex-col items-center text-center">
        <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-[#242424] overflow-hidden">
          {barber.photoUrl ? (
            <img
              src={barber.photoUrl}
              alt={fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <FiUser className="w-8 h-8 text-[#8A8A8A]" />
          )}
        </div>

        <h3 className="text-[15px] font-semibold text-white">{fullName}</h3>
        <p className="mt-0.5 text-[12px] text-[#8A8A8A]">{service}</p>

        <div className="mt-3 flex items-center gap-1.5">
          <FiStar className="w-3.5 h-3.5 text-[#FF5C00] fill-[#FF5C00]" />
          <span className="text-[13px] font-medium text-white">{rating}</span>
          <span className="text-[12px] text-[#8A8A8A]">({reviews} reseñas)</span>
        </div>
      </div>
    </motion.button>
  );
};
