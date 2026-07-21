export type ResultadoValidacionFoto = {
  valido: boolean;
  motivo?: string;
};

export interface IFaceValidationService {
  validar(imagenBuffer: Buffer): Promise<ResultadoValidacionFoto>;
}
