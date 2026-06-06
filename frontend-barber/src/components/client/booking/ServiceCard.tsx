import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiClock } from 'react-icons/fi';
import {
  MdContentCut,
  MdFace,
  MdFlashOn,
  MdStar,
  MdCleaningServices,
} from 'react-icons/md';
import type { IconType } from 'react-icons';
import type { Service } from '../../../types/booking';

const serviceIconMap: Record<string, IconType> = {
  corte: MdContentCut,
  barba: MdFace,
  lavado: MdCleaningServices,
  arreglo: MdFlashOn,
  premium: MdStar,
};

const DefaultIcon = MdContentCut;

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onSelect: (service: Service) => void;
}

const resolveIconKey = (name: string): string => {
  const lower = name.toLowerCase();
  for (const key of Object.keys(serviceIconMap)) {
    if (lower.includes(key)) return key;
  }
  return '';
};

const renderServiceIcon = (name: string, className: string) => {
  const iconKey = resolveIconKey(name);
  const Icon = serviceIconMap[iconKey] ?? DefaultIcon;
  return React.createElement(Icon, { className, key: name });
};

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect }) => {
  const shortDescription = service.description.length > 80
    ? `${service.description.slice(0, 80)}...`
    : service.description;

  return (
    <motion.button
      onClick={() => onSelect(service)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative w-full rounded-[16px] border bg-[#1A1A1A] p-5 text-left transition-all duration-300
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

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#FF5C00]/10">
          {renderServiceIcon(service.name, 'w-6 h-6 text-[#FF5C00]')}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-white">{service.name}</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-[#8A8A8A]">{shortDescription}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1 text-[12px] text-[#8A8A8A]">
              <FiClock className="w-3.5 h-3.5" />
              {service.durationMinutes} min
            </div>
            <span className="text-[16px] font-bold text-[#FF5C00]">${service.price}</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
};
