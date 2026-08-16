import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { AnimatedContainer } from '../../common';
import { ServiceCard } from './ServiceCard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import type { Service } from '../../../types/booking';

const serviceListVariants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.04, staggerChildren: 0.045 } },
};

const serviceItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
};

interface ServiceSelectionStepProps {
  services: Service[];
  selectedService: Service | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (service: Service) => void;
  onRetry?: () => void;
}

export const ServiceSelectionStep: React.FC<ServiceSelectionStepProps> = ({
  services,
  selectedService,
  isLoading,
  error,
  onSelect,
  onRetry,
}) => {
  const reduceMotion = useReducedMotion();

  if (isLoading && services.length === 0) {
    return <AnimatedContainer animation="fadeIn" duration={0.28}><div className="p-5 sm:p-6"><LoadingSkeleton variant="card" count={4} className="sm:grid-cols-2" /></div></AnimatedContainer>;
  }

  if (error && services.length === 0) {
    return (
      <div className="m-5 rounded-[16px] border border-red-500/30 bg-red-500/[0.08] p-5 text-center sm:m-6">
        <p className="text-[13px] text-red-400">{error}</p>
        <p className="mt-1 text-[11px] text-[#8A8A8A]">Revisá tu conexión y volvé a intentarlo. <span className="sr-only">Intentá de nuevo más tarde</span></p>
        {onRetry && <button type="button" onClick={onRetry} className="mt-4 rounded-full border border-[#FF5C00]/40 px-3 py-1.5 text-[11px] font-semibold text-[#FF8A4C] transition-colors hover:bg-[#FF5C00]/10 focus-visible:ring-2 focus-visible:ring-[#FF5C00]">Reintentar</button>}
      </div>
    );
  }

  return (
    <AnimatedContainer animation="fadeIn" duration={0.3}>
      <div data-testid="service-selection-step" data-count={services.length} className="space-y-5 p-5 sm:p-6">
        <span className="sr-only" aria-hidden="true">Seleccioná el servicio que querés</span>
        {error && services.length > 0 && <div className="rounded-[12px] border border-red-500/20 bg-red-500/[0.05] px-3 py-2"><p className="text-[12px] text-red-400">{error}</p></div>}
        {services.length === 0 ? (
          <div className="rounded-[16px] border border-[#2A2A2A] bg-[#111111] p-6 text-center">
            <p className="text-[14px] font-semibold text-white">No hay servicios disponibles</p>
            <p className="mt-1 text-[12px] text-[#777777]">Probá nuevamente más tarde.</p>
          </div>
        ) : (
          <>
            <motion.div variants={serviceListVariants} initial={reduceMotion ? false : 'hidden'} animate="visible" className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {services.map((service) => (
                <motion.div key={service.id} variants={serviceItemVariants}>
                  <ServiceCard service={service} isSelected={selectedService?.id === service.id} onSelect={onSelect} />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </AnimatedContainer>
  );
};
