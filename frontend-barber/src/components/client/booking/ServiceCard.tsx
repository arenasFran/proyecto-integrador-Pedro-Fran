import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
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
  return (
    <motion.button
      onClick={() => onSelect(service)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`
        relative w-full rounded-[10px] border bg-[#1A1A1A] px-5 py-4 text-left transition-all duration-200
        ${isSelected
          ? 'border-[#FF5C00] bg-[#FF5C00]/5 shadow-[0_0_10px_rgba(255,92,0,0.1)]'
          : 'border-[#282828] hover:border-[#FF5C00]/40'
        }
      `}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FF5C00]/10">
            {renderServiceIcon(service.name, 'w-5 h-5 text-[#FF5C00]')}
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-white">{service.name}</h3>
            <p className="text-[12px] text-[#8A8A8A] truncate">{service.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[15px] font-bold text-[#FF5C00]">${service.price}</span>
          {isSelected && (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5C00]">
              <FiCheck className="w-2.5 h-2.5 text-white" />
            </div>
          )}
        </div>
      </div>
    </motion.button>
  );
};
