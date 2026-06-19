export interface OverviewData {
  totalReservas: number;
  duracionTotalMinutos: number;
  ingresosTotales: number;
  nuevosClientes: number;
  estadisticasPorEstado: Record<string, number>;
}

export interface HeatmapEntry {
  fecha: string;
  cantidad: number;
}

export interface ReservasGananciasEntry {
  periodo: string;
  cantidadReservas: number;
  ganancias: number;
}

export interface DistribucionEntry {
  barberId: string;
  nombre: string;
  cantidad: number;
  ingresos: number;
}

export interface DistribucionData {
  porBarbero: DistribucionEntry[];
}

export type Granularidad = 'diario' | 'semanal' | 'mensual' | 'anual';

export interface ReportFilters {
  granularidad: Granularidad;
  barberId?: string;
  serviceId?: string;
  status?: string;
}
