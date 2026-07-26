import { construirPrompt, parsearYValidar } from '../../../src/infrastructure/services/GeminiRecommendationService';
import { AppError } from '../../../src/domain/errors/AppError';
import { ServicioParaPrompt } from '../../../src/application/ports/IRecommendationService';

describe('parsearYValidar', () => {
  const servicios: ServicioParaPrompt[] = [
    { name: 'Corte clásico', description: 'Corte tradicional con máquina y tijera' },
    { name: 'Fade bajo', description: 'Degradado bajo con acabado prolijo' },
  ];

  const respuestaValida = () =>
    JSON.stringify({
      formaCara: 'ovalada',
      cortesRecomendados: [
        {
          nombreCorte: 'Fade bajo',
          descripcion: 'Degradado sutil que estiliza el rostro',
          razon: 'Favorece rostros ovalados',
          servicioSugerido: 'Fade bajo',
        },
      ],
      explicacionGeneral: 'Tu rostro ovalado combina bien con degradados bajos.',
    });

  it('acepta una respuesta válida y la devuelve tal cual', () => {
    const texto = respuestaValida();
    expect(parsearYValidar(texto, servicios)).toEqual(JSON.parse(texto));
  });

  it('rechaza JSON inválido', () => {
    expect(() => parsearYValidar('esto no es json', servicios)).toThrow(AppError);
    try {
      parsearYValidar('esto no es json', servicios);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('AI_ERROR');
      expect((error as AppError).statusCode).toBe(503);
    }
  });

  it('rechaza cortesRecomendados vacío', () => {
    const texto = JSON.stringify({
      formaCara: 'ovalada',
      cortesRecomendados: [],
      explicacionGeneral: 'texto',
    });
    expect(() => parsearYValidar(texto, servicios)).toThrow(AppError);
  });

  it('rechaza un campo con tipo incorrecto en un corte recomendado', () => {
    const parsed = JSON.parse(respuestaValida());
    parsed.cortesRecomendados[0].nombreCorte = 123;
    expect(() => parsearYValidar(JSON.stringify(parsed), servicios)).toThrow(AppError);
  });

  it('rechaza un servicioSugerido que no existe en la lista de servicios reales', () => {
    const parsed = JSON.parse(respuestaValida());
    parsed.cortesRecomendados[0].servicioSugerido = 'Servicio inventado por la IA';
    expect(() => parsearYValidar(JSON.stringify(parsed), servicios)).toThrow(AppError);
  });

  it('rechaza si falta formaCara', () => {
    const parsed = JSON.parse(respuestaValida());
    delete parsed.formaCara;
    expect(() => parsearYValidar(JSON.stringify(parsed), servicios)).toThrow(AppError);
  });

  it('rechaza si falta explicacionGeneral', () => {
    const parsed = JSON.parse(respuestaValida());
    delete parsed.explicacionGeneral;
    expect(() => parsearYValidar(JSON.stringify(parsed), servicios)).toThrow(AppError);
  });

  it('rechaza si cortesRecomendados no es un array', () => {
    const parsed = JSON.parse(respuestaValida());
    parsed.cortesRecomendados = 'no es un array';
    expect(() => parsearYValidar(JSON.stringify(parsed), servicios)).toThrow(AppError);
  });
});

describe('construirPrompt', () => {
  it('interpola el nombre y la descripción de cada servicio en la lista', () => {
    const servicios: ServicioParaPrompt[] = [
      { name: 'Corte clásico', description: 'Corte tradicional con máquina y tijera' },
      { name: 'Fade bajo', description: 'Degradado bajo con acabado prolijo' },
    ];

    const prompt = construirPrompt(servicios);

    expect(prompt).toContain('"Corte clásico": Corte tradicional con máquina y tijera');
    expect(prompt).toContain('"Fade bajo": Degradado bajo con acabado prolijo');
  });

  it('no menciona un servicio si no viene en la lista recibida (ej. excluido aguas arriba)', () => {
    const servicios: ServicioParaPrompt[] = [
      { name: 'Corte clásico', description: 'Corte tradicional con máquina y tijera' },
    ];

    const prompt = construirPrompt(servicios);

    expect(prompt).not.toContain('Promo x2');
  });

  it('pide explícitamente formato JSON estricto', () => {
    const prompt = construirPrompt([{ name: 'Corte clásico', description: 'desc' }]);

    expect(prompt).toContain('Respondé ÚNICAMENTE con JSON');
  });
});
