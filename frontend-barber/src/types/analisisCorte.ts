export type CorteRecomendado = {
  nombreCorte: string;
  descripcion: string;
  razon: string;
  servicioSugerido: string;
};

export type AnalisisCorteResultado = {
  formaCara: string;
  cortesRecomendados: CorteRecomendado[];
  explicacionGeneral: string;
};

export type AnalisisCorteRecord = {
  id: string;
  clienteId: string;
  resultado: AnalisisCorteResultado;
  createdAt: string;
};

export type CupoAnalisisCorte = {
  disponible: boolean;
  proximaFechaDisponible: string | null;
};

export type HistorialAnalisisCorte = {
  historial: AnalisisCorteRecord[];
  cupo: CupoAnalisisCorte;
};
