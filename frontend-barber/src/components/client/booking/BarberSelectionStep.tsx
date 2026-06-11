import React from 'react';
import { motion } from 'framer-motion';
import { FiUser } from 'react-icons/fi';
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
  onSelectAny?: () => void;
  anyBarber?: boolean;
}

export const BarberSelectionStep: React.FC<BarberSelectionStepProps> = ({
  barbers,
  selectedBarber,
  isLoading,
  error,
  onSelect,
  onSelectAny,
  anyBarber = false,
}) => {
  if (isLoading && barbers.length === 0) {
    return <LoadingSkeleton variant="card" count={4} />;
  }

  if (error) {
    return (
      <div className="rounded-[12px] border border-red-500/30 bg-red-500/10 p-4 text-center">
        <p className="text-[13px] text-red-400">{error}</p>
        <p className="mt-1 text-[11px] text-[#8A8A8A]">Intentá de nuevo más tarde</p>
      </div>
    );
  }

  if (barbers.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4 text-center">
        <p className="text-[13px] text-[#8A8A8A]">No hay barberos disponibles</p>
      </div>
    );
  }

  const isAnySelected = anyBarber || selectedBarber?.id === 'any';

  return (
    <AnimatedContainer animation="fadeInUp">
      <div className="p-4 space-y-4">
        <p className="text-[12px] text-[#8A8A8A]">Elegí tu barbero preferido</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {barbers.map((barber, index) => (
            <motion.div
              key={barber.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.2 }}
            >
              <BarberCard
                barber={barber}
                isSelected={selectedBarber?.id === barber.id && !anyBarber}
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </div>

        {onSelectAny && (
          <motion.button
            onClick={() => onSelectAny()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`
              w-full flex items-center justify-center gap-2 rounded-[10px] border border-dashed py-2.5 px-4 text-[12px] font-medium transition-all duration-200
              ${isAnySelected
                ? 'border-[#FF5C00] text-[#FF5C00] bg-[#FF5C00]/5'
                : 'border-[#282828] text-[#8A8A8A] hover:text-[#FF5C00] hover:border-[#FF5C00]/40'
              }
            `}
          >
            <FiUser className="w-3.5 h-3.5" />
            {isAnySelected ? 'Sin preferencia (elegimos el mejor horario)' : 'No tengo preferencia'}
          </motion.button>
        )}
      </div>
    </AnimatedContainer>
  );
};
