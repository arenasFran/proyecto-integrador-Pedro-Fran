import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedContainer } from '../../common';
import { ServiceCard } from './ServiceCard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import type { Service } from '../../../types/booking';

interface ServiceSelectionStepProps {
  services: Service[];
  selectedService: Service | null;
  isLoading: boolean;
  error: string | null;
  onSelect: (service: Service) => void;
}

export const ServiceSelectionStep: React.FC<ServiceSelectionStepProps> = ({
  services,
  selectedService,
  isLoading,
  error,
  onSelect,
}) => {
  if (isLoading && services.length === 0) {
    return <LoadingSkeleton variant="card" count={4} />;
  }

  if (error) {
    return (
      <div className="rounded-[16px] border border-red-500/30 bg-red-500/10 p-6 text-center">
        <p className="text-[14px] text-red-400">{error}</p>
        <p className="mt-2 text-[12px] text-[#8A8A8A]">Intentá de nuevo más tarde</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-6 text-center">
        <p className="text-[14px] text-[#8A8A8A]">No hay servicios disponibles</p>
      </div>
    );
  }

  return (
    <AnimatedContainer animation="fadeInUp">
      <div className="grid grid-cols-1 gap-4">
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <ServiceCard
              service={service}
              isSelected={selectedService?.id === service.id}
              onSelect={onSelect}
            />
          </motion.div>
        ))}
      </div>
    </AnimatedContainer>
  );
};
