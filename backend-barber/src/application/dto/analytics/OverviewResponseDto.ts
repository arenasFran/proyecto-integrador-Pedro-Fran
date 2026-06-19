export interface OverviewResponseDto {
  totalReservas: number;
  duracionTotalMinutos: number;
  ingresosTotales: number;
  nuevosClientes: number;
  estadisticasPorEstado: Record<string, number>;
}
