export type ImagenGenerada = {
  base64: string;
  mimeType: string;
};

export interface IImageGenerationService {
  generarEjemploDeCorte(nombreCorte: string, descripcion: string): Promise<ImagenGenerada>;
}
