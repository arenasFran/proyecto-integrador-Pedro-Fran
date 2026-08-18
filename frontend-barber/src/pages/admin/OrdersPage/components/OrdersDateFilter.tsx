import { useEffect, useRef, useState } from 'react';
import { FiCalendar } from 'react-icons/fi';
import { DatePicker } from '../../../../components/common/DatePicker';
import type { PresetKey } from '../../../../components/common/dateRangeUtils';
import { resolvePreset } from '../../../../components/common/dateRangeUtils';

interface OrdersDateFilterProps {
  onChange: (desde: string, hasta: string) => void;
  defaultPreset?: PresetKey;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: '7 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'year', label: 'Este año' },
  { key: 'personalizado', label: 'Personalizado' },
];

export default function OrdersDateFilter({ onChange, defaultPreset = 'mes' }: OrdersDateFilterProps) {
  const [preset, setPreset] = useState<PresetKey>(defaultPreset);
  const [customDesde, setCustomDesde] = useState('');
  const [customHasta, setCustomHasta] = useState('');
  const [activePicker, setActivePicker] = useState<'desde' | 'hasta' | null>(null);
  const onChangeRef = useRef(onChange);
  const initialised = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    const range = resolvePreset(defaultPreset);
    onChangeRef.current(range.desde, range.hasta);
  }, [defaultPreset]);

  const handlePreset = (nextPreset: PresetKey) => {
    setPreset(nextPreset);
    setActivePicker(null);
    if (nextPreset !== 'personalizado') {
      const range = resolvePreset(nextPreset);
      onChange(range.desde, range.hasta);
    }
  };

  const applyCustom = () => {
    if (!customDesde || !customHasta) return;
    setActivePicker(null);
    onChange(customDesde, customHasta);
  };

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5" aria-label="Rango de fechas">
      <FiCalendar className="mr-1 shrink-0 text-[#6A6A6A]" size={14} aria-hidden="true" />
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => handlePreset(key)}
          className={`h-8 shrink-0 rounded-[8px] px-2.5 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5C00] ${
            preset === key
              ? 'bg-[#FF5C00] text-white'
              : 'text-[#8A8A8A] hover:bg-[#1A1A1A] hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
      {preset === 'personalizado' && (
        <div className="ml-1 flex shrink-0 items-center gap-1.5">
          <DatePicker
            value={customDesde}
            onChange={(value) => { setCustomDesde(value); setActivePicker(null); }}
            open={activePicker === 'desde'}
            onOpenChange={(open) => setActivePicker(open ? 'desde' : null)}
          />
          <span className="text-[11px] text-[#555]">a</span>
          <DatePicker
            value={customHasta}
            onChange={(value) => { setCustomHasta(value); setActivePicker(null); }}
            open={activePicker === 'hasta'}
            onOpenChange={(open) => setActivePicker(open ? 'hasta' : null)}
          />
          <button
            type="button"
            onClick={applyCustom}
            disabled={!customDesde || !customHasta}
            className="h-8 rounded-[8px] bg-[#FF5C00] px-2.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
