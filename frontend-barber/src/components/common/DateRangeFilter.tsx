import { useState, useEffect, useRef } from 'react';
import { DatePicker } from './DatePicker';

export type PresetKey = 'hoy' | 'ayer' | 'semana' | 'semanaPasada' | 'mes' | 'year' | 'personalizado';

export function detectPreset(desde: string, hasta: string): PresetKey {
  const PRESET_KEYS: PresetKey[] = ['hoy', 'ayer', 'semana', 'semanaPasada', 'mes', 'year'];
  for (const key of PRESET_KEYS) {
    const { desde: pd, hasta: ph } = resolvePreset(key);
    if (pd === desde && ph === hasta) return key;
  }
  return 'personalizado';
}

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

function resolvePreset(p: PresetKey): { desde: string; hasta: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  switch (p) {
    case 'hoy':
      return { desde: toISODate(today), hasta: toISODate(today) };
    case 'ayer': {
      const ayer = new Date(today);
      ayer.setDate(ayer.getDate() - 1);
      return { desde: toISODate(ayer), hasta: toISODate(ayer) };
    }
    case 'semana': {
      const dia = today.getDay();
      const lunes = new Date(today);
      lunes.setDate(lunes.getDate() + (dia === 0 ? -6 : 1 - dia));
      const domingo = new Date(lunes);
      domingo.setDate(domingo.getDate() + 6);
      return { desde: toISODate(lunes), hasta: toISODate(domingo) };
    }
    case 'semanaPasada': {
      const dia = today.getDay();
      const lunes = new Date(today);
      lunes.setDate(lunes.getDate() + (dia === 0 ? -6 : 1 - dia) - 7);
      const domingo = new Date(lunes);
      domingo.setDate(domingo.getDate() + 6);
      return { desde: toISODate(lunes), hasta: toISODate(domingo) };
    }
    case 'mes': {
      const inicio = new Date(today.getFullYear(), today.getMonth(), 1);
      const fin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { desde: toISODate(inicio), hasta: toISODate(fin) };
    }
    case 'year': {
      return { desde: toISODate(new Date(today.getFullYear(), 0, 1)), hasta: toISODate(new Date(today.getFullYear(), 11, 31)) };
    }
    default:
      return { desde: toISODate(today), hasta: toISODate(today) };
  }
}

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
