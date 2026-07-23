import { useState, useEffect, useRef } from 'react';
import { DatePicker } from './DatePicker';
import type { PresetKey } from './dateRangeUtils';
import { resolvePreset } from './dateRangeUtils';

interface DateRangeFilterProps {
  onChange: (desde: string, hasta: string) => void;
  defaultPreset?: PresetKey;
  skipMountEffect?: boolean;
  initialCustomDesde?: string;
  initialCustomHasta?: string;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'semanaPasada', label: 'Semana pasada' },
  { key: 'mes', label: 'Este mes' },
  { key: 'year', label: 'Este año' },
  { key: 'personalizado', label: 'Personalizar' },
];

export default function DateRangeFilter({ onChange, defaultPreset = 'semana', skipMountEffect, initialCustomDesde = '', initialCustomHasta = '' }: DateRangeFilterProps) {
  const [preset, setPreset] = useState<PresetKey>(defaultPreset);
  const [customDesde, setCustomDesde] = useState(initialCustomDesde);
  const [customHasta, setCustomHasta] = useState(initialCustomHasta);
  const [activePicker, setActivePicker] = useState<'desde' | 'hasta' | null>(null);
  const initialised = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });

  useEffect(() => {
    if (!initialised.current && !skipMountEffect) {
      initialised.current = true;
      if (typeof onChangeRef.current === 'function') {
        const { desde, hasta } = resolvePreset(defaultPreset);
        onChangeRef.current(desde, hasta);
      }
    }
  }, [defaultPreset, skipMountEffect]);

  const handlePreset = (key: PresetKey) => {
    if (key === 'personalizado') {
      setPreset('personalizado');
      return;
    }
    setPreset(key);
    setActivePicker(null);
    const { desde, hasta } = resolvePreset(key);
    onChange(desde, hasta);
  };

  const applyCustom = () => {
    if (customDesde && customHasta) {
      setPreset('personalizado');
      onChange(customDesde, customHasta);
    }
  };

  const isCustom = preset === 'personalizado';

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handlePreset(key)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            preset === key
              ? 'bg-[#FF5C00] text-white'
              : 'bg-[#1A1A1A] text-[#8A8A8A] border border-[#282828] hover:border-[#FF5C00] hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}

      {isCustom && (
        <div className="flex flex-wrap items-center gap-2 ml-2 w-full sm:w-auto">
          <DatePicker
            value={customDesde}
            onChange={(v) => { setCustomDesde(v); setActivePicker(null); }}
            open={activePicker === 'desde'}
            onOpenChange={(o) => setActivePicker(o ? 'desde' : null)}
          />
          <span className="text-[#8A8A8A] text-sm shrink-0">—</span>
          <DatePicker
            value={customHasta}
            onChange={(v) => { setCustomHasta(v); setActivePicker(null); }}
            open={activePicker === 'hasta'}
            onOpenChange={(o) => setActivePicker(o ? 'hasta' : null)}
          />
          <button
            onClick={applyCustom}
            className="px-3 py-2 bg-[#FF5C00] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
