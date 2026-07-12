import { useEffect, useState } from 'react';
import { professionalService } from '../services/professional.service';
import type { SlotsReason } from '../types/professional';

export function useAvailableSlots(barberId: string, date: string, enabled: boolean, excludeAppointmentId?: string) {
  const [slots, setSlots] = useState<string[]>([]);
  const [reason, setReason] = useState<SlotsReason | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || !barberId || !date) {
      setSlots([]);
      setReason(undefined);
      setError(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(false);
    professionalService.getSlots(barberId, date, excludeAppointmentId)
      .then((res) => {
        if (!cancelled) {
          setSlots(res.slots);
          setReason(res.reason);
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
  }, [barberId, date, enabled, excludeAppointmentId]);

  return { slots, reason, isLoading, error };
}
