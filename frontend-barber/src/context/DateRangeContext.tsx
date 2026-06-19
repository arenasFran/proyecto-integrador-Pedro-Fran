import { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type PresetKey = 'hoy' | 'ayer' | 'semana' | 'semanaPasada' | 'mes' | 'anio' | 'personalizado';

export interface DateRange {
  desde: string;
  hasta: string;
  preset: PresetKey;
}

interface DateRangeContextValue {
  range: DateRange;
  setPreset: (preset: PresetKey) => void;
  setCustom: (desde: string, hasta: string) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null);

function resolvePreset(preset: PresetKey): { desde: string; hasta: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const toISODate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  switch (preset) {
    case 'hoy':
      return { desde: toISODate(today), hasta: toISODate(today) };
    case 'ayer': {
      const ayer = new Date(today);
      ayer.setDate(ayer.getDate() - 1);
      return { desde: toISODate(ayer), hasta: toISODate(ayer) };
    }
    case 'semana': {
      const dia = today.getDay();
      const diffLunes = dia === 0 ? -6 : 1 - dia;
      const lunes = new Date(today);
      lunes.setDate(lunes.getDate() + diffLunes);
      const domingo = new Date(lunes);
      domingo.setDate(domingo.getDate() + 6);
      return { desde: toISODate(lunes), hasta: toISODate(domingo) };
    }
    case 'semanaPasada': {
      const dia2 = today.getDay();
      const diffLunes2 = dia2 === 0 ? -6 : 1 - dia2;
      const lunesPasado = new Date(today);
      lunesPasado.setDate(lunesPasado.getDate() + diffLunes2 - 7);
      const domingoPasado = new Date(lunesPasado);
      domingoPasado.setDate(domingoPasado.getDate() + 6);
      return { desde: toISODate(lunesPasado), hasta: toISODate(domingoPasado) };
    }
    case 'mes': {
      const inicio = new Date(today.getFullYear(), today.getMonth(), 1);
      const fin = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { desde: toISODate(inicio), hasta: toISODate(fin) };
    }
    case 'anio': {
      const inicio = new Date(today.getFullYear(), 0, 1);
      const fin = new Date(today.getFullYear(), 11, 31);
      return { desde: toISODate(inicio), hasta: toISODate(fin) };
    }
    default:
      return { desde: toISODate(today), hasta: toISODate(today) };
  }
}

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useState<DateRange>(() => {
    const { desde, hasta } = resolvePreset('semana');
    return { desde, hasta, preset: 'semana' };
  });

  const setPreset = useCallback((preset: PresetKey) => {
    const { desde, hasta } = resolvePreset(preset);
    setRange({ desde, hasta, preset });
  }, []);

  const setCustom = useCallback((desde: string, hasta: string) => {
    setRange({ desde, hasta, preset: 'personalizado' });
  }, []);

  const value = useMemo(() => ({ range, setPreset, setCustom }), [range, setPreset, setCustom]);

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) {
    throw new Error('useDateRange debe usarse dentro de DateRangeProvider');
  }
  return ctx;
}
