import React from 'react';
import { FiEdit3, FiTrash2, FiUser, FiPower } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { BarberAvatar, Button, LoadingSkeleton } from '../../../../components/common';
import type { Professional } from '../../../../types/professional';
import { OccupancyBadge } from './OccupancyBadge';

type ProfessionalsListProps = {
  professionals: Professional[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onEdit: (professional: Professional) => void;
  onToggleActive: (professional: Professional) => void;
  onDelete: (professional: Professional) => void;
  isLoading: boolean;
};

export const ProfessionalsList: React.FC<ProfessionalsListProps> = ({
  professionals,
  searchTerm,
  onSearchChange,
  onEdit,
  onToggleActive,
  onDelete,
  isLoading,
}) => {
  return (
    <div>
      <div className="relative mb-6">
        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8A8A] w-4 h-4" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nombre, email o teléfono..."
          className="w-full h-[44px] pl-10 pr-4 bg-[#1A1A1A] border border-[#282828] rounded-[12px] text-[14px] text-white placeholder:text-[#8A8A8A] outline-none focus:border-[#FF5C00] focus:ring-1 focus:ring-[#FF5C00]/20 transition-all"
          aria-label="Buscar barberos"
        />
      </div>

      <div className="grid gap-3">
        {isLoading ? (
          <LoadingSkeleton variant="card" count={4} />
        ) : professionals.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#282828] bg-[#1A1A1A] p-8 flex flex-col items-center justify-center text-center">
            <FiUser className="w-10 h-10 text-[#8A8A8A] mb-3" />
            <p className="text-[15px] font-medium text-white">No hay barberos</p>
            <p className="text-[13px] text-[#8A8A8A] mt-1">
              {searchTerm
                ? 'No se encontraron resultados para tu búsqueda.'
                : 'Presioná "Nuevo barbero" para agregar el primero.'}
            </p>
          </div>
        ) : (
          professionals.map((professional, index) => (
            <motion.div
              key={professional.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-5 hover:border-[#FF5C00]/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <BarberAvatar
                      name={professional.name}
                      lastname={professional.lastname}
                      photoUrl={professional.photoUrl}
                      size="md"
                    />
                    <h3 className={`text-[16px] font-semibold truncate ${
                      professional.isActive ? 'text-white' : 'text-[#8A8A8A]'
                    }`}>
                      {professional.name} {professional.lastname}
                    </h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                        professional.isActive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-[#242424] text-[#8A8A8A]'
                      }`}
                    >
                      {professional.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#8A8A8A]">
                    <span>{professional.email}</span>
                    <span>{professional.phone}</span>
                    <span className="text-[#FF5C00]/80">
                      {professional.slotDuration} min / turno
                    </span>
                  </div>
                  {professional.services.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {professional.services.slice(0, 3).map((service) => (
                        <span
                          key={service}
                          className="rounded-full bg-[#242424] px-2.5 py-0.5 text-[11px] text-[#8A8A8A]"
                        >
                          {service}
                        </span>
                      ))}
                      {professional.services.length > 3 && (
                        <span className="rounded-full bg-[#242424] px-2.5 py-0.5 text-[11px] text-[#8A8A8A]">
                          +{professional.services.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {professional.isActive && (
                <div className="mt-3 pt-3 border-t border-[#282828]">
                  <OccupancyBadge barberId={professional.id} />
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={FiEdit3}
                  onClick={() => onEdit(professional)}
                >
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={FiPower}
                  onClick={() => onToggleActive(professional)}
                >
                  {professional.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={FiTrash2}
                  onClick={() => onDelete(professional)}
                >
                  Eliminar
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProfessionalsList;
