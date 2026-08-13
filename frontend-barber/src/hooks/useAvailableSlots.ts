import { useEffect, useState } from 'react';
import { professionalService } from '../services/professional.service';
import type { SlotsReason } from '../types/professional';

export function useAvailableSlots(barberId: string, date: string, enabled: boolean, excludeAppointmentId?: string) {
  const active = Boolean(enabled && barberId && date);
  const [slots, setSlots] = useState<string[]>([]);
  const [reason, setReason] = useState<SlotsReason | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(active);
  const [error, setError] = useState(false);

  const fetchKey = active ? `${barberId}|${date}|${excludeAppointmentId ?? ''}` : '';
  const [lastKey, setLastKey] = useState(fetchKey);
  if (fetchKey !== lastKey) {
    setLastKey(fetchKey);
    if (active) setIsLoading(true);
  }

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    professionalService.getSlots(barberId, date, excludeAppointmentId)
      .then((res) => {
        if (!cancelled) {
          setSlots(res.slots);
          setReason(res.reason);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setReason(undefined);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [active, barberId, date, excludeAppointmentId]);

  return {
    slots: active ? slots : [],
    reason: active ? reason : undefined,
    isLoading: active ? isLoading : false,
    error: active ? error : false,
  };
}