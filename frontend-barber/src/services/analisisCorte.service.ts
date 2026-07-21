import api from './api';
import type { AnalisisCorteResultado } from '../types/analisisCorte';

export const analizarCorte = async (
  file: File,
  aceptaConsentimiento?: boolean
): Promise<AnalisisCorteResultado> => {
  const formData = new FormData();
  formData.append('foto', file);
  if (aceptaConsentimiento) formData.append('aceptaConsentimiento', 'true');

  const response = await api.post<AnalisisCorteResultado>('/api/analisis-corte', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};
