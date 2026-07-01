import { useEffect, useState } from 'react';
import { Select } from '../../../../components/common/Select';
import { professionalService } from '../../../../services/professional.service';
import type { Professional } from '../../../../types/professional';
import { useGetServicesQuery } from '../../../../services/service.api';

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

  const { data: services = [] } = useGetServicesQuery();

  return (
    <div className="flex flex-wrap items-center gap-3 mt-2">
      {error && <p className="text-[#FF5C00] text-xs w-full">{error}</p>}

      <Select
        label="Barbero"
        value={barberId ?? ''}
        onChange={(v) => onBarberChange(v || undefined)}
        options={[
          { value: '', label: 'Todos los barberos' },
          ...barbers.map((b) => ({ value: b.id, label: b.name })),
        ]}
      />

      <Select
        label="Servicio"
        value={serviceId ?? ''}
        onChange={(v) => onServiceChange(v || undefined)}
        options={[
          { value: '', label: 'Todos los servicios' },
          ...services.map((s) => ({ value: s.id, label: s.name })),
        ]}
      />

      {showStatus && onStatusChange && (
        <Select
          label="Estado"
          value={status ?? ''}
          onChange={(v) => onStatusChange(v || undefined)}
          options={STATUS_OPTS.map((opt) => ({ value: opt.value, label: opt.label }))}
        />
      )}
    </div>
  );
}
