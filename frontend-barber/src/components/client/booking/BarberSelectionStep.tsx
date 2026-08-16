import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { FiUser } from 'react-icons/fi';
import { AnimatedContainer } from '../../common';
import { BarberCard } from './BarberCard';
import type { BarberPublic } from '../../../types/booking';

const barberListVariants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.04, staggerChildren: 0.045 } },
};

const barberItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

interface BarberSelectionStepProps {
  barbers: BarberPublic[];
  selectedBarber: BarberPublic | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (barber: BarberPublic) => void;
  onRetry?: () => void;
  onSelectAny?: () => void;
  anyBarber?: boolean;
}

export const BarberSelectionStep: React.FC<BarberSelectionStepProps> = ({
  barbers,
  selectedBarber,
  isLoading,
  error,
  onSelect,
  onRetry,
  onSelectAny,
  anyBarber = false,
}) => {
  const reduceMotion = useReducedMotion();

  // Do not animate an intermediate empty state while the initial request is pending.
  if (isLoading && barbers.length === 0) return null;

  if (error && barbers.length === 0) {
    return (
      <AnimatedContainer animation="fadeIn" duration={0.3} delay={0.4}>
        <div className="m-5 rounded-[16px] border border-red-500/30 bg-red-500/[0.08] p-5 text-center sm:m-6">
          <p className="text-[13px] text-red-400">{error}</p>
          <p className="mt-1 text-[11px] text-[#8A8A8A]">Revisá tu conexión y volvé a intentarlo. <span className="sr-only">Intentá de nuevo más tarde</span></p>
          {onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-full border border-[#FF5C00]/40 px-3 py-1.5 text-[11px] font-semibold text-[#FF8A4C] transition-colors hover:bg-[#FF5C00]/10 focus-visible:ring-2 focus-visible:ring-[#FF5C00]">Reintentar</button>}
        </div>
      </AnimatedContainer>
    );
  }

  return (
    <AnimatedContainer animation="fadeIn" duration={0.3} delay={0.4}>
      <div data-testid="barber-selection-step" data-count={barbers.length} className="space-y-6 p-5 sm:p-6">
        {onSelectAny && <button type="button" tabIndex={-1} className="sr-only" onClick={onSelectAny}>{anyBarber ? 'Sin preferencia (elegimos el mejor horario)' : 'No tengo preferencia'}</button>}
        {error && barbers.length > 0 && (
          <div className="rounded-[12px] border border-red-500/20 bg-red-500/[0.05] px-3 py-2">
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        {barbers.length === 0 ? (
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#111111] p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#242424] text-[#FF8A4C]"><FiUser className="h-5 w-5" /></div>
            <p className="mt-4 text-[14px] font-semibold text-white">No hay barberos disponibles</p>
            <p className="mx-auto mt-1 max-w-xs text-[12px] leading-5 text-[#777777]">En este momento no encontramos profesionales para mostrar.</p>
          </div>
        ) : (
          <>
            <motion.div variants={barberListVariants} initial={reduceMotion ? false : 'hidden'} animate="visible" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {barbers.map((barber) => (
                <motion.div
                  key={barber.id}
                  variants={barberItemVariants}
                  className="min-w-0"
                >
                  <BarberCard barber={barber} isSelected={selectedBarber?.id === barber.id} onSelect={onSelect} />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </AnimatedContainer>
  );
};
