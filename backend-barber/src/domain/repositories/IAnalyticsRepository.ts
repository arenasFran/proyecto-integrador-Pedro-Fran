export type OverviewResult = {
  totalReservas: number;
  duracionTotalMinutos: number;
  ingresosTotales: number;
  nuevosClientes: number;
  estadisticasPorEstado: Record<string, number>;
};

export type HeatmapEntry = {
  fecha: string;
  cantidad: number;
};

export type DistribucionEntry = {
  barberId: string;
  nombre: string;
  cantidad: number;
  ingresos: number;
};

export type ReservasGananciasEntry = {
  periodo: string;
  cantidadReservas: number;
  ganancias: number;
};

export type ReservasGananciasFilters = {
  desde: string;
  hasta: string;
  granularidad: 'diario' | 'semanal' | 'mensual' | 'anual';
  barberId?: string;
  serviceId?: string;
  status?: string;
};

export interface IAnalyticsRepository {
  getOverview(desde: string, hasta: string): Promise<OverviewResult>;
  getHeatmap(param: { anio?: number; ultimoAnio?: boolean }): Promise<HeatmapEntry[]>;
  getDistribucion(desde: string, hasta: string): Promise<DistribucionEntry[]>;
  getReservasGanancias(filters: ReservasGananciasFilters): Promise<ReservasGananciasEntry[]>;
}
