export type DistribucionResponseDto = {
  porBarbero: Array<{
    barberId: string;
    nombre: string;
    cantidad: number;
    ingresos: number;
  }>;
};
