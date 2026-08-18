import React from 'react';
import { FiEdit3, FiMail, FiPhone, FiPower, FiTrash2, FiUser } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { BarberAvatar, Button } from '../../../../components/common';
import type { Professional } from '../../../../types/professional';

type ProfessionalsListProps = {
  professionals: Professional[];
  onEdit: (professional: Professional) => void;
  onToggleActive: (professional: Professional) => void;
  onDelete: (professional: Professional) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
  onCreate: () => void;
};

const getScheduleSummary = (professional: Professional) => {
  const configuredDays = Object.values(professional.schedule ?? {}).filter(
    (day) => day.startTime && day.endTime
  ).length;
  return configuredDays > 0 ? `${configuredDays} ${configuredDays === 1 ? 'día' : 'días'} configurados` : 'Sin horario configurado';
};

const SkeletonProfessionalCard = () => (
  <div className="rounded-[18px] border border-[#242424] bg-[#111111] p-5" aria-hidden="true">
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 animate-pulse rounded-full bg-[#242424]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#242424]" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-[#242424]" />
      </div>
    </div>
    <div className="mt-6 space-y-3">
      <div className="h-3 w-full animate-pulse rounded bg-[#242424]" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-[#242424]" />
      <div className="h-8 w-full animate-pulse rounded bg-[#242424]" />
    </div>
  </div>
);

export const ProfessionalsList: React.FC<ProfessionalsListProps> = ({
  professionals,
  onEdit,
  onToggleActive,
  onDelete,
  isLoading,
  errorMessage,
  onRetry,
  onCreate,
}) => {
  return (
    <section aria-label="Lista de profesionales">
      {errorMessage && (
        <div className="mb-4 flex flex-col gap-3 rounded-[14px] border border-red-500/25 bg-red-500/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div>
            <p className="text-[13px] font-semibold text-red-200">No pudimos actualizar la lista</p>
            <p className="mt-1 text-[12px] text-red-200/70">{errorMessage}. Podés reintentar sin perder el orden elegido.</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry}>Reintentar</Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Cargando profesionales">
          {Array.from({ length: 6 }, (_, index) => <SkeletonProfessionalCard key={index} />)}
        </div>
      ) : professionals.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#333] bg-[#111111] px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#FF5C00]/10 text-[#FF8A4C]">
            <FiUser className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-[16px] font-semibold text-white">Todavía no hay profesionales</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-[#777]">
            Sumá el primer barbero para empezar a organizar turnos, horarios y disponibilidad.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button icon={FiUser} onClick={onCreate}>Nuevo barbero</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {professionals.map((professional, index) => (
            <motion.article
              key={professional.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.035, 0.2), duration: 0.2 }}
              className="group flex min-h-[260px] flex-col rounded-[18px] border border-[#242424] bg-[#111111] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#FF5C00]/35 hover:bg-[#141414] hover:shadow-[0_12px_30px_rgba(0,0,0,0.2)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <BarberAvatar
                    name={professional.name}
                    lastname={professional.lastname}
                    photoUrl={professional.photoUrl}
                    size="lg"
                  />
                  <div className="min-w-0">
                    <h3 className={`truncate text-[16px] font-semibold ${professional.isActive ? 'text-white' : 'text-[#A0A0A0]'}`}>
                      {professional.name} {professional.lastname}
                    </h3>
                    <p className="mt-1 text-[12px] text-[#777]">Profesional</p>
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${professional.isActive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-[#242424] text-[#888]'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${professional.isActive ? 'bg-emerald-400' : 'bg-[#666]'}`} aria-hidden="true" />
                  {professional.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <div className="mt-5 space-y-2 text-[12px] text-[#8A8A8A]">
                <p className="flex min-w-0 items-center gap-2 truncate">
                  <FiMail className="h-3.5 w-3.5 shrink-0 text-[#626262]" aria-hidden="true" />
                  <span className="truncate">{professional.email}</span>
                </p>
                <p className="flex items-center gap-2">
                  <FiPhone className="h-3.5 w-3.5 shrink-0 text-[#626262]" aria-hidden="true" />
                  <span>{professional.phone}</span>
                </p>
              </div>

              {(professional.services ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(professional.services ?? []).slice(0, 3).map((service) => (
                    <span key={service} className="rounded-[7px] bg-[#202020] px-2 py-1 text-[11px] text-[#B0B0B0]">
                      {service}
                    </span>
                  ))}
                  {(professional.services ?? []).length > 3 && (
                    <span className="rounded-[7px] bg-[#202020] px-2 py-1 text-[11px] text-[#777]">
                      +{professional.services.length - 3}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-auto pt-5">
                <div className="flex items-center justify-between border-t border-[#242424] pt-4 text-[11px] text-[#777]">
                  <span>{getScheduleSummary(professional)}</span>
                  <span className="font-medium text-[#FF8A4C]">{professional.slotDuration} min / turno</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" icon={FiEdit3} onClick={() => onEdit(professional)}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" icon={FiPower} onClick={() => onToggleActive(professional)}>
                    {professional.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="ghost" size="sm" icon={FiTrash2} onClick={() => onDelete(professional)} className="text-[#A87878] hover:text-red-300">
                    Eliminar
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
};

export default ProfessionalsList;
