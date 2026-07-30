export type CorteRecomendado = {
  nombreCorte: string;
  descripcion: string;
  razon: string;
  servicioSugerido: string;
  imagenEjemploUrl?: string;
};

export type AnalisisCorteResultado = {
  formaCara: string;
  cortesRecomendados: CorteRecomendado[];
  explicacionGeneral: string;
};

export type AnalisisCorteCreado = AnalisisCorteResultado & { id: string };

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
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  cupo: CupoAnalisisCorte;
  consentimientoAceptado: boolean;
};
