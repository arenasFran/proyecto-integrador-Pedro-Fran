import React, { useEffect, useState } from 'react';
import professionalService from '../../../../services/professional.service';
import type { OccupancyResponse } from '../../../../types/professional';

type OccupancyBadgeProps = {
  barberId: string;
};

export const OccupancyBadge: React.FC<OccupancyBadgeProps> = ({ barberId }) => {
  const [occupancy, setOccupancy] = useState<OccupancyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const today = new Date().toISOString().split('T')[0];
    professionalService.getOccupancy(barberId, today)
      .then((data) => {
        if (!cancelled) setOccupancy(data);
      })
      .catch(() => {
        if (!cancelled) setOccupancy(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [barberId]);

  if (loading) {
    return <span className="text-[11px] text-[#8A8A8A]">Cargando ocupación...</span>;
  }

  if (!occupancy) {
    return null;
  }

  const pct = occupancy.ocupacion;
  const colorClass =
    pct > 80 ? 'bg-red-500' : pct >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
  const textColorClass =
    pct > 80 ? 'text-red-400' : pct >= 50 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="relative group/tooltip inline-flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-[#282828] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className={`text-[12px] font-semibold ${textColorClass}`}>
        {pct}% ocupación
      </span>

      <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50 pointer-events-none">
        <div className="rounded-lg bg-[#1E1E1E] border border-[#333] px-3 py-2 text-[12px] text-[#B0B0B0] shadow-xl whitespace-nowrap">
          <p>
            <span className="text-white font-medium">{occupancy.appointmentsCount}</span> turnos agendados
          </p>
          <p>
            <span className="text-white font-medium">{occupancy.availableSlots}</span> slots disponibles
          </p>
          <p>
            <span className="text-white font-medium">{occupancy.totalSlots}</span> slots totales
          </p>
          <p>
            <span className="text-white font-medium">{occupancy.blockedSlots}</span> slots bloqueados
          </p>
        </div>
      </div>
    </div>
  );
};

export default OccupancyBadge;
