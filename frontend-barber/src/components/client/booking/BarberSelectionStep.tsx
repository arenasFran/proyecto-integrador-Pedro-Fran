import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedContainer } from '../../common';
import { BarberCard } from './BarberCard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import type { BarberPublic } from '../../../types/booking';

interface BarberSelectionStepProps {
  barbers: BarberPublic[];
  selectedBarber: BarberPublic | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (barber: BarberPublic) => void;
}

export const BarberSelectionStep: React.FC<BarberSelectionStepProps> = ({
  barbers,
  selectedBarber,
  isLoading,
  error,
  onSelect,
}) => {
  if (isLoading && barbers.length === 0) {
    return <LoadingSkeleton variant="card" count={6} />;
  }

  if (error) {
    return (
      <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-[14px] text-red-400">{error}</p>
        <p className="mt-2 text-[12px] text-[#8A8A8A]">Intentá de nuevo más tarde</p>
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-6 text-center">
        <p className="text-[14px] text-[#8A8A8A]">No hay barberos disponibles</p>
      </div>
    );
  }

  return (
    <AnimatedContainer animation="fadeInUp">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {barbers.map((barber, index) => (
          <motion.div
            key={barber.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <BarberCard
              barber={barber}
              isSelected={selectedBarber?.id === barber.id}
              onSelect={onSelect}
            />
          </motion.div>
        ))}
      </div>
    </AnimatedContainer>
  );
};
