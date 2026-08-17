import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck } from 'react-icons/fi';
import { MdContentCut, MdFace, MdFlashOn, MdStar, MdCleaningServices } from 'react-icons/md';
import type { IconType } from 'react-icons';
import type { Service } from '../../../types/booking';

const serviceIconMap: Record<string, IconType> = {
  corte: MdContentCut,
  barba: MdFace,
  lavado: MdCleaningServices,
  arreglo: MdFlashOn,
  premium: MdStar,
};

const resolveIcon = (name: string): IconType => {
  const lower = name.toLowerCase();
  const key = Object.keys(serviceIconMap).find((candidate) => lower.includes(candidate));
  return key ? serviceIconMap[key] : MdContentCut;
};

interface ServiceCardProps {
  service: Service;
  isSelected: boolean;
  onSelect: (service: Service) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect }) => {
  const icon = React.createElement(resolveIcon(service.name), { className: 'h-5 w-5' });

  return (
    <motion.button
      onClick={() => onSelect(service)}
      type="button"
      aria-pressed={isSelected}
      aria-label={`Elegir servicio ${service.name}`}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.99 }}
      className={`group relative w-full overflow-hidden rounded-[17px] border px-4 py-4 text-left outline-none transition-[border-color,background-color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-[#FF5C00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] ${
        isSelected
          ? 'border-[#FF5C00] bg-[#211813] shadow-[0_14px_32px_rgba(255,92,0,0.1)]'
          : 'border-[#292929] bg-[#151515] hover:border-[#FF5C00]/55 hover:bg-[#191919]'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] transition-colors duration-300 ${isSelected ? 'bg-[#FF5C00] text-white' : 'bg-[#25201D] text-[#FF8A4C] group-hover:bg-[#2D231E]'}`}>
          {service.imageUrl ? <img src={service.imageUrl} alt="" className="h-full w-full rounded-[13px] object-cover" loading="lazy" /> : icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-white">{service.name}</span>
          <span className="mt-1 block min-h-[2rem] line-clamp-2 text-[12px] leading-4 text-[#7D7D7D]">{service.description}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[15px] font-bold text-[#FF8A4C]">${service.price}</span>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-300 ${isSelected ? 'border-[#FF5C00] bg-[#FF5C00] text-white' : 'border-[#383838] text-transparent'}`}>
            <FiCheck className="h-3 w-3" />
          </span>
        </span>
      </div>
    </motion.button>
  );
};
