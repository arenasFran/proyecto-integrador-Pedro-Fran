export type PresetKey = 'hoy' | 'ayer' | 'semana' | 'semanaPasada' | 'mes' | 'year' | 'personalizado';

export function resolvePreset(p: PresetKey): { desde: string; hasta: string } {
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

export function detectPreset(desde: string, hasta: string): PresetKey {
  const PRESET_KEYS: PresetKey[] = ['hoy', 'ayer', 'semana', 'semanaPasada', 'mes', 'year'];
  for (const key of PRESET_KEYS) {
    const { desde: pd, hasta: ph } = resolvePreset(key);
    if (pd === desde && ph === hasta) return key;
  }
  return 'personalizado';
}
