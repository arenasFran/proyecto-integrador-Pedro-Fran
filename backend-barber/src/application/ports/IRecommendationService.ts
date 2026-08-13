export type CorteRecomendado = {
  nombreCorte: string;
  descripcion: string;
  razon: string;
  servicioSugerido: string;
  imagenEjemploUrl?: string;
};

export type ResultadoRecomendacion = {
  formaCara: string;
  cortesRecomendados: CorteRecomendado[];
  explicacionGeneral: string;
};

export type ServicioParaPrompt = {
  name: string;
  description: string;
};

export interface IRecommendationService {
  recomendar(imagenBuffer: Buffer, mimeType: string, servicios: ServicioParaPrompt[]): Promise<ResultadoRecomendacion>;
}
