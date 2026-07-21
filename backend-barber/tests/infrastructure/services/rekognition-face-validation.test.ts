import type { FaceDetail } from '@aws-sdk/client-rekognition';
import { validarDetalleCara } from '../../../src/infrastructure/services/RekognitionFaceValidationService';

describe('validarDetalleCara', () => {
  const caraValida = (): FaceDetail => ({
    Confidence: 99,
    Quality: { Sharpness: 80, Brightness: 70 },
    Pose: { Yaw: 5 },
    FaceOccluded: { Value: false, Confidence: 90 },
  });

  it('acepta una cara válida', () => {
    expect(validarDetalleCara([caraValida()])).toEqual({ valido: true });
  });

  it('rechaza si no se detectó ninguna cara', () => {
    expect(validarDetalleCara([])).toEqual({
      valido: false,
      motivo: 'No se detectó ninguna cara en la foto',
    });
  });

  it('rechaza si se detectó más de una cara', () => {
    expect(validarDetalleCara([caraValida(), caraValida()])).toEqual({
      valido: false,
      motivo: 'Se detectó más de una persona, subí una foto individual',
    });
  });

  it('rechaza si la confianza de detección es menor a 90', () => {
    const cara = { ...caraValida(), Confidence: 85 };
    expect(validarDetalleCara([cara])).toEqual({
      valido: false,
      motivo: 'No se pudo confirmar que la imagen contiene una cara clara',
    });
  });

  it('rechaza si la foto está borrosa (Sharpness < 40)', () => {
    const cara = { ...caraValida(), Quality: { Sharpness: 30, Brightness: 70 } };
    expect(validarDetalleCara([cara])).toEqual({
      valido: false,
      motivo: 'La foto está borrosa o mal iluminada, probá con mejor luz/enfoque',
    });
  });

  it('rechaza si la foto está mal iluminada (Brightness < 30)', () => {
    const cara = { ...caraValida(), Quality: { Sharpness: 80, Brightness: 10 } };
    expect(validarDetalleCara([cara])).toEqual({
      valido: false,
      motivo: 'La foto está borrosa o mal iluminada, probá con mejor luz/enfoque',
    });
  });

  it('rechaza si el ángulo de la cara supera los 35 grados', () => {
    const cara = { ...caraValida(), Pose: { Yaw: 40 } };
    expect(validarDetalleCara([cara])).toEqual({
      valido: false,
      motivo: 'Subí una foto de frente, no muy de perfil',
    });
  });

  it('acepta un ángulo negativo dentro del rango (valor absoluto)', () => {
    const cara = { ...caraValida(), Pose: { Yaw: -30 } };
    expect(validarDetalleCara([cara])).toEqual({ valido: true });
  });

  it('rechaza si la cara está tapada con alta confianza', () => {
    const cara = { ...caraValida(), FaceOccluded: { Value: true, Confidence: 90 } };
    expect(validarDetalleCara([cara])).toEqual({
      valido: false,
      motivo: 'Tu cara está tapada en la foto (mano, cabello, etc.)',
    });
  });

  it('acepta cara marcada como tapada pero con baja confianza', () => {
    const cara = { ...caraValida(), FaceOccluded: { Value: true, Confidence: 50 } };
    expect(validarDetalleCara([cara])).toEqual({ valido: true });
  });
});
