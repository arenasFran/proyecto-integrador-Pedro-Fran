import { useState } from 'react';
import { useDateRange, type PresetKey } from '../../../../context/DateRangeContext';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: 'ayer', label: 'Ayer' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'semanaPasada', label: 'Semana pasada' },
  { key: 'mes', label: 'Este mes' },
  { key: 'anio', label: 'Este año' },
  { key: 'personalizado', label: 'Personalizar' },
];

export default function DateFilterBar() {
  const { range, setPreset, setCustom } = useDateRange();
  const [customDesde, setCustomDesde] = useState(range.desde);
  const [customHasta, setCustomHasta] = useState(range.hasta);

  const isCustom = range.preset === 'personalizado';

  const handlePreset = (preset: PresetKey) => {
    if (preset === 'personalizado') {
      setCustomDesde(range.desde);
      setCustomHasta(range.hasta);
    }
    setPreset(preset);
  };

  const applyCustom = () => {
    if (customDesde && customHasta) {
      setCustom(customDesde, customHasta);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ key, label }) => {
        const isActive = range.preset === key;
        return (
          <button
            key={key}
            onClick={() => handlePreset(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#FF5C00] text-white'
                : 'bg-[#1A1A1A] text-[#8A8A8A] border border-[#282828] hover:border-[#FF5C00] hover:text-white'
            }`}
          >
            {label}
          </button>
        );
      })}

      {isCustom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customDesde}
            onChange={(e) => setCustomDesde(e.target.value)}
            className="bg-[#1A1A1A] border border-[#282828] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
          />
          <span className="text-[#8A8A8A] text-sm">—</span>
          <input
            type="date"
            value={customHasta}
            onChange={(e) => setCustomHasta(e.target.value)}
            className="bg-[#1A1A1A] border border-[#282828] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
          />
          <button
            onClick={applyCustom}
            className="px-3 py-2 bg-[#FF5C00] text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}
