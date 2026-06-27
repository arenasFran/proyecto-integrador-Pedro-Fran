import { useEffect, useState } from 'react';
import { professionalService } from '../../../../services/professional.service';
import type { Professional } from '../../../../types/professional';
import { serviceService } from '../../../../services/service.service';
import type { Service } from '../../../../types/booking';

interface ChartFiltersProps {
  barberId: string | undefined;
  onBarberChange: (id: string | undefined) => void;
  serviceId: string | undefined;
  onServiceChange: (id: string | undefined) => void;
  status?: string | undefined;
  onStatusChange?: (s: string | undefined) => void;
}

const STATUS_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'completado', label: 'Completado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'noshow', label: 'No asistió' },
];

export default function ChartFilters({
  barberId, onBarberChange,
  serviceId, onServiceChange,
  status, onStatusChange,
}: ChartFiltersProps) {
  const showStatus = onStatusChange !== undefined;
  const [barbers, setBarbers] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleError = (err: unknown, fallback: string) => {
    const msg = err && typeof err === 'object' && 'response' in err
      ? String((err as { response: { data: { error: string } } }).response?.data?.error ?? fallback)
      : fallback;
    setError(msg);
  };

  useEffect(() => {
    professionalService.list()
      .then(setBarbers)
      .catch((err) => handleError(err, 'Error al cargar barberos'));
  }, []);

  useEffect(() => {
    serviceService.list()
      .then(setServices)
      .catch((err) => handleError(err, 'Error al cargar servicios'));
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      {error && <p className="text-[#FF5C00] text-xs w-full">{error}</p>}

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

      {showStatus && onStatusChange && (
        <select
          value={status ?? ''}
          onChange={(e) => onStatusChange(e.target.value || undefined)}
          className="bg-[#1A1A1A] border border-[#282828] rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
        >
          {STATUS_OPTS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
