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

  if (error && services.length === 0) {
    return (
      <div className="rounded-[12px] border border-red-500/30 bg-red-500/10 p-4 text-center">
        <p className="text-[13px] text-red-400">{error}</p>
        <p className="mt-1 text-[11px] text-[#8A8A8A]">Intentá de nuevo más tarde</p>
      </div>
    );
  }

  return (
    <AnimatedContainer animation="fadeInUp">
      <div className="p-4 space-y-3">
        {error && services.length > 0 && (
          <div className="rounded-[10px] border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-[12px] text-red-400">{error}</p>
          </div>
        )}

        {services.length === 0 ? (
          <div className="rounded-[10px] border border-[#282828] bg-[#1A1A1A] p-4 text-center">
            <p className="text-[13px] text-[#8A8A8A]">No hay servicios disponibles</p>
          </div>
        ) : (
          <>
            <p className="text-[12px] text-[#8A8A8A]">Seleccioná el servicio que querés</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.2 }}
                >
                  <ServiceCard
                    service={service}
                    isSelected={selectedService?.id === service.id}
                    onSelect={onSelect}
                  />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </AnimatedContainer>
  );
};
