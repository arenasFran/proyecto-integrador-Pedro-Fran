import { useEffect, useState } from 'react';
import type { Granularidad } from '../../../../types/analytics';
import { professionalService } from '../../../../services/professional.service';
import type { Professional } from '../../../../types/professional';
import { serviceService } from '../../../../services/service.service';
import type { Service } from '../../../../types/booking';

interface ChartFiltersProps {
  granularidad: Granularidad;
  onGranularidadChange: (g: Granularidad) => void;
  barberId: string | undefined;
  onBarberChange: (id: string | undefined) => void;
  serviceId: string | undefined;
  onServiceChange: (id: string | undefined) => void;
  status: string | undefined;
  onStatusChange: (s: string | undefined) => void;
}

const GRANULARIDAD_OPTS: { value: Granularidad; label: string }[] = [
  { value: 'diario', label: 'Diario' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'anual', label: 'Anual' },
];

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'noshow', label: 'No asistió' },
];

export default function ChartFilters({
  granularidad, onGranularidadChange,
  barberId, onBarberChange,
  serviceId, onServiceChange,
  status, onStatusChange,
}: ChartFiltersProps) {
  const [barbers, setBarbers] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    professionalService.list()
      .then(setBarbers)
      .catch((err) => setError(err?.response?.data?.error ?? 'Error al cargar barberos'));
  }, []);

  useEffect(() => {
    serviceService.list()
      .then(setServices)
      .catch((err) => setError(err?.response?.data?.error ?? 'Error al cargar servicios'));
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      {error && <p className="text-[#FF5C00] text-xs w-full">{error}</p>}

      <div className="flex bg-[#1A1A1A] border border-[#282828] rounded-xl overflow-hidden">
        {GRANULARIDAD_OPTS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onGranularidadChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              granularidad === opt.value
                ? 'bg-[#FF5C00] text-white'
                : 'text-[#8A8A8A] hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <select
        value={barberId ?? ''}
        onChange={(e) => onBarberChange(e.target.value || undefined)}
        className="bg-[#1A1A1A] border border-[#282828] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
      >
        <option value="">Todos los barberos</option>
        {barbers.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <select
        value={serviceId ?? ''}
        onChange={(e) => onServiceChange(e.target.value || undefined)}
        className="bg-[#1A1A1A] border border-[#282828] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
      >
        <option value="">Todos los servicios</option>
        {services.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select
        value={status ?? ''}
        onChange={(e) => onStatusChange(e.target.value || undefined)}
        className="bg-[#1A1A1A] border border-[#282828] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
      >
        {STATUS_OPTS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
