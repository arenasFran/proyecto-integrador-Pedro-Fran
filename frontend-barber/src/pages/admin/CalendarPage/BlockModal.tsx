import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Select, Button, useToast } from '../../../components/common';
import type { SelectOption } from '../../../components/common';
import { professionalService } from '../../../services/professional.service';
import { getAccessToken } from '../../../services/api';
import { getTokenUser } from '../../../utils/token';
import { SlotTimePicker } from './SlotTimePicker';
import type { BarberPublic, BarberBlock } from '../../../types/booking';
import type { BarberSchedule, DayKey } from '../../../types/professional';

interface BlockModalProps {
  dateStr: string;
  onClose: () => void;
  onBlockCreated?: (block: BarberBlock) => void;
}

const daysOfWeek: Record<number, DayKey> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function dateToDayKey(dateStr: string): DayKey {
  const d = new Date(dateStr + 'T12:00:00');
  return daysOfWeek[d.getDay()];
}

function generateTimeOptions(startH: number, endH: number, excludeStart?: boolean, excludeEnd?: boolean): SelectOption[] {
  const options: SelectOption[] = [];
  const from = excludeStart ? startH + 1 : startH;
  const to = excludeEnd ? endH - 1 : endH;
  for (let h = from; h <= to; h++) {
    const val = `${String(h).padStart(2, '0')}:00`;
    options.push({ value: val, label: val });
  }
  return options;
}

export const BlockModal: React.FC<BlockModalProps> = ({ dateStr, onClose, onBlockCreated }) => {
  const { showToast } = useToast();
  const [barbers, setBarbers] = useState<BarberPublic[]>([]);
  const [barberId, setBarberId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<BarberSchedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const currentUser = getTokenUser(getAccessToken());
  const isAdmin = currentUser?.kind === 'Admin';

  useEffect(() => {
    professionalService.getPublic().then((list) => {
      setBarbers(list);
      if (!isAdmin && currentUser?.id) {
        setBarberId(currentUser.id);
      }
    }).catch((error: unknown) => showToast(error instanceof Error ? error.message : 'No se pudieron cargar los barberos', 'error'));
  }, [isAdmin, currentUser?.id, showToast]);

  useEffect(() => {
    if (!barberId) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScheduleLoading(true);
    professionalService.getSchedule(barberId)
      .then((s) => { if (!cancelled) setSchedule(s); })
      .catch(() => { if (!cancelled) { setSchedule(null); setLocalError('No se pudo cargar el horario del barbero.'); } })
      .finally(() => { if (!cancelled) setScheduleLoading(false); });
    return () => { cancelled = true; };
  }, [barberId]);

  const dayKey = useMemo(() => dateToDayKey(dateStr), [dateStr]);
  const daySchedule = schedule?.[dayKey];
  const isDayOff = schedule && (!daySchedule?.startTime || !daySchedule?.endTime);

  const startOptions = useMemo(() => {
    if (!daySchedule?.startTime || !daySchedule?.endTime) return [];
    const startH = parseInt(daySchedule.startTime.split(':')[0], 10);
    const endH = parseInt(daySchedule.endTime.split(':')[0], 10);
    return generateTimeOptions(startH, endH, false, true);
  }, [daySchedule]);

  const endOptions = useMemo(() => {
    if (!daySchedule?.startTime || !daySchedule?.endTime) return [];
    const startH = parseInt(daySchedule.startTime.split(':')[0], 10);
    const endH = parseInt(daySchedule.endTime.split(':')[0], 10);
    return generateTimeOptions(startH, endH, true, false);
  }, [daySchedule]);

  const hasOptions = startOptions.length > 0 && endOptions.length > 0;

  const barberOptions: SelectOption[] = barbers.map((b) => ({
    value: b.id,
    label: `${b.name} ${b.lastname}`,
  }));

  const handleBarberChange = (id: string) => {
    setBarberId(id);
    setStartTime('');
    setEndTime('');
    setLocalError(null);
  };

  const handleSubmit = async () => {
    if (!barberId) {
      setLocalError('Seleccioná un barbero.');
      return;
    }
    if (!startTime || !endTime) {
      setLocalError('Completá hora de inicio y fin.');
      return;
    }
    if (startTime >= endTime) {
      setLocalError('La hora de inicio debe ser anterior a la de fin.');
      return;
    }

    setIsSubmitting(true);
    setLocalError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`/api/barbers/${barberId}/blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: dateStr,
          startTime,
          endTime,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Error al crear bloque');
      }

      if (body.block && onBlockCreated) {
        onBlockCreated(body.block as BarberBlock);
      }

      showToast('Horario bloqueado');
      onClose();
    } catch (err: unknown) {
      setLocalError(err instanceof Error ? err.message : 'Error al crear bloque');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderTimePickers = () => {
    if (!barberId) return null;

    if (scheduleLoading) {
      return <p className="text-[13px] text-[#8A8A8A] text-center">Cargando horario...</p>;
    }

    if (isDayOff) {
      return <p className="text-[13px] text-yellow-400 text-center">El barbero no trabaja este día.</p>;
    }

    if (!hasOptions) {
      return null;
    }

    return (
      <div key={barberId}>
        {/* Mobile */}
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          <SlotTimePicker
            label="Inicio"
            options={startOptions.map((o) => o.value)}
            value={startTime}
            onChange={setStartTime}
          />
          <SlotTimePicker
            label="Fin"
            options={endOptions.map((o) => o.value)}
            value={endTime}
            onChange={setEndTime}
          />
        </div>

        {/* Desktop */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-3">
          <Select
            label="Inicio"
            value={startTime}
            onChange={setStartTime}
            options={startOptions}
            placeholder="Seleccionar"
          />
          <Select
            label="Fin"
            value={endTime}
            onChange={setEndTime}
            options={endOptions}
            placeholder="Seleccionar"
          />
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen onClose={onClose} title={`Bloquear horario - ${dateStr}`} size="sm">
      <div className="flex flex-col gap-4">
        {isAdmin && (
          <Select
            label="Barbero"
            value={barberId}
            onChange={handleBarberChange}
            options={barberOptions}
            placeholder="Seleccionar barbero"
          />
        )}

        {renderTimePickers()}

        {localError && (
          <p className="text-[12px] text-red-400">{localError}</p>
        )}

        <Button
          onClick={handleSubmit}
          loading={isSubmitting}
          disabled={isSubmitting || !hasOptions || !!isDayOff}
          variant="secondary"
          className="w-full"
        >
          Bloquear
        </Button>
      </div>
    </Modal>
  );
};
