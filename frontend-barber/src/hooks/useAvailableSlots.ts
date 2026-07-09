import { useEffect, useState } from 'react';
import { professionalService } from '../services/professional.service';

export function useAvailableSlots(barberId: string, date: string, enabled: boolean) {
  const [slots, setSlots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || !barberId || !date) {
      setSlots([]);
      setError(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(false);
    professionalService.getSlots(barberId, date)
      .then((res) => {
        if (!cancelled) setSlots(res.slots);
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [barberId, date, enabled]);

  return { slots, isLoading, error };
}
