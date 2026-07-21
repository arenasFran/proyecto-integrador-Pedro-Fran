export const CUPO_DIAS_ANALISIS_CORTE = 30;

export type CupoAnalisisCorte = {
  disponible: boolean;
  proximaFechaDisponible: string | null;
};

export function calcularCupoAnalisisCorte(
  ultimoAnalisisFecha: Date | null | undefined
): CupoAnalisisCorte {
  if (!ultimoAnalisisFecha) {
    return { disponible: true, proximaFechaDisponible: null };
  }

  const proximaFecha = new Date(ultimoAnalisisFecha);
  proximaFecha.setDate(proximaFecha.getDate() + CUPO_DIAS_ANALISIS_CORTE);

  if (proximaFecha.getTime() <= Date.now()) {
    return { disponible: true, proximaFechaDisponible: null };
  }

  return { disponible: false, proximaFechaDisponible: proximaFecha.toISOString() };
}
