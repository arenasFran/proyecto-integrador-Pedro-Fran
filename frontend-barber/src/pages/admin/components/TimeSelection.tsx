import React, { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiClock } from 'react-icons/fi';
import { Select } from '../../../components/common';
import type { SelectOption } from '../../../components/common';
import type { BarberSchedule } from '../../../types/professional';
import {
  LAST_MINUTE_OF_DAY,
  addMinutes,
  formatDuration,
  getDaySchedule,
  isOutOfSchedule,
} from '../../../utils/time';

type SelectionMode = 'available' | 'custom';

interface TimeSelectionProps {
  /** Título de la sección. */
  label?: string;
  value: string;
  onChange: (time: string) => void;
  /** Duración del turno según el barbero. 0 = todavía no se sabe. */
  slotDuration: number;
  availableSlots: string[];
  isLoadingSlots?: boolean;
  date: string;
  schedule?: BarberSchedule | null;
  disabled?: boolean;
  /** Selector de horarios de la agenda (Select, TimeSlotGrid, etc.). */
  availablePicker: React.ReactNode;
}

const MINUTE_STEP = 5;

const HOUR_OPTIONS: SelectOption[] = Array.from({ length: 24 }, (_, hour) => {
  const value = String(hour).padStart(2, '0');
  return { value, label: value };
});

const MINUTE_OPTIONS: SelectOption[] = Array.from(
  { length: 60 / MINUTE_STEP },
  (_, index) => {
    const value = String(index * MINUTE_STEP).padStart(2, '0');
    return { value, label: value };
  }
);

const toggleClassName = (active: boolean) =>
  `h-9 flex-1 rounded-[10px] border text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    active
      ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-[#FF5C00]'
      : 'border-[#282828] text-[#8A8A8A] hover:text-white'
  }`;

/**
 * Selector de horario para el staff.
 *
 * - "Horarios disponibles": el listado que genera la agenda del barbero.
 * - "Fuera de agenda": hora manual en formato 24 h (hora + minutos), para
 *   turnos que la agenda no ofrece (antes de abrir, después de cerrar, en un
 *   descanso o en un día libre). El cliente nunca ve estos horarios.
 *
 * Siempre muestra la hora de fin y la duración del turno, y no permite elegir
 * un inicio que termine después de las 23:59.
 */
export function TimeSelection({
  label = 'Horario',
  value,
  onChange,
  slotDuration,
  availableSlots,
  isLoadingSlots = false,
  date,
  schedule,
  disabled = false,
  availablePicker,
}: TimeSelectionProps) {
  const [manualMode, setManualMode] = useState(false);
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');

  const duration = slotDuration > 0 ? slotDuration : 0;
  const maxStart = duration > 0 ? LAST_MINUTE_OF_DAY - duration : LAST_MINUTE_OF_DAY;
  const endTime = value && duration > 0 ? addMinutes(value, duration) : '';
  const overflowsDay = Boolean(value && duration > 0 && !endTime);

  // Si el valor viene de afuera y no está en la agenda (por ejemplo, al
  // reprogramar un turno que ya era fuera de horario), abrimos el modo manual.
  const autoCustom =
    Boolean(value) && !isLoadingSlots && !availableSlots.includes(value);
  const mode: SelectionMode = manualMode || autoCustom ? 'custom' : 'available';

  const canUseCustom = duration > 0 && !disabled;

  // Mantiene los selectores alineados con la hora elegida.
  useEffect(() => {
    if (mode !== 'custom' || !value) return;
    const [nextHour, nextMinute] = value.split(':');
    if (!nextHour || !nextMinute) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour((current) => (current === nextHour ? current : nextHour));
    setMinute((current) => (current === nextMinute ? current : nextMinute));
  }, [mode, value]);

  // Propaga al padre recién cuando hora y minutos están completos.
  useEffect(() => {
    if (mode !== 'custom' || !hour || !minute) return;
    const next = `${hour}:${minute}`;
    if (next !== value) onChange(next);
  }, [mode, hour, minute, value, onChange]);

  const minuteOptions = useMemo(() => {
    if (!hour) return MINUTE_OPTIONS;
    const hourStart = Number(hour) * 60;
    return MINUTE_OPTIONS.filter(
      (option) => hourStart + Number(option.value) <= maxStart
    );
  }, [hour, maxStart]);

  const handleHourChange = (nextHour: string) => {
    setHour(nextHour);
    if (!nextHour) return;
    const candidate = minute || '00';
    const total = Number(nextHour) * 60 + Number(candidate);
    setMinute(total <= maxStart ? candidate : '00');
  };

  const handleSelectAvailable = () => {
    if (value && !availableSlots.includes(value)) onChange('');
    setManualMode(false);
    setHour('');
    setMinute('');
  };

  const handleSelectCustom = () => {
    setManualMode(true);
    if (value) {
      const [nextHour, nextMinute] = value.split(':');
      setHour(nextHour);
      setMinute(nextMinute);
    }
  };

  const outOfSchedule = useMemo(() => {
    if (!value || !endTime) return false;
    const day = getDaySchedule(schedule, date);
    if (!day) return false;
    return isOutOfSchedule(value, endTime, day);
  }, [value, endTime, schedule, date]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-medium text-white">{label}</span>

      <div className="flex gap-2">
        <button
          type="button"
          aria-pressed={mode === 'available'}
          disabled={disabled}
          onClick={handleSelectAvailable}
          className={toggleClassName(mode === 'available')}
        >
          Horarios disponibles
        </button>
        <button
          type="button"
          aria-pressed={mode === 'custom'}
          disabled={!canUseCustom}
          onClick={handleSelectCustom}
          className={toggleClassName(mode === 'custom')}
        >
          Fuera de agenda
        </button>
      </div>

      {mode === 'available' ? (
        <div className="flex flex-col gap-1.5">
          {availablePicker}
          {!isLoadingSlots && !disabled && availableSlots.length === 0 && (
            <p className="text-[11px] leading-5 text-[#8A8A8A]">
              No hay horarios en la agenda para este día. Usá «Fuera de agenda»
              para elegir otro horario.
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 rounded-[12px] border border-[#282828] bg-[#151515] p-3">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <Select
              label="Hora"
              value={hour}
              onChange={handleHourChange}
              options={HOUR_OPTIONS}
              placeholder="HH"
              disabled={!canUseCustom}
            />
            <span
              aria-hidden="true"
              className="pb-2.5 text-[15px] font-semibold text-[#5A5A5A]"
            >
              :
            </span>
            <Select
              label="Minutos"
              value={minute}
              onChange={setMinute}
              options={minuteOptions}
              placeholder="MM"
              disabled={!canUseCustom}
            />
          </div>
          <p className="text-[11px] leading-5 text-[#8A8A8A]">
            Antes de abrir, después de cerrar, en un descanso o en un día libre.
            No se ofrece a los clientes.
          </p>
        </div>
      )}

      <div className="rounded-[12px] border border-[#2A2A2A] bg-[#151515] px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-[13px]">
            <FiClock className="h-3.5 w-3.5 shrink-0 text-[#8A8A8A]" />
            {endTime ? (
              <span className="truncate text-white">
                <span className="font-semibold">{value}</span>
                <span className="mx-1 text-[#6A6A6A]">a</span>
                <span className="font-semibold">{endTime}</span>
              </span>
            ) : (
              <span className="truncate text-[#8A8A8A]">
                {duration > 0
                  ? 'Elegí la hora de inicio'
                  : 'Elegí un barbero para ver la duración'}
              </span>
            )}
          </span>
          {duration > 0 && (
            <span className="shrink-0 rounded-full bg-[#242424] px-2 py-0.5 text-[10px] font-semibold text-[#C8C8C8]">
              {formatDuration(duration)}
            </span>
          )}
        </div>

        {overflowsDay && (
          <p className="mt-1.5 text-[11px] text-red-400">
            El turno terminaría después de las 23:59. Elegí una hora más temprana.
          </p>
        )}

        {!overflowsDay && outOfSchedule && (
          <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-medium text-[#FF8A4C]">
            <FiAlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Fuera de la agenda del barbero: el cliente no lo verá al reservar.
          </p>
        )}
      </div>
    </div>
  );
}
