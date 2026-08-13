import { calcularCupoAnalisisCorte } from '../../../../src/application/use-cases/analisis-corte/calcularCupoAnalisisCorte';

describe('calcularCupoAnalisisCorte', () => {
  it('está disponible si nunca hizo un análisis', () => {
    expect(calcularCupoAnalisisCorte(null)).toEqual({ disponible: true, proximaFechaDisponible: null });
  });

  it('no está disponible si pasaron menos de 30 días desde el último análisis', () => {
    const hace10Dias = new Date();
    hace10Dias.setDate(hace10Dias.getDate() - 10);
    const fechaEsperada = new Date(hace10Dias);
    fechaEsperada.setDate(fechaEsperada.getDate() + 30);

    const cupo = calcularCupoAnalisisCorte(hace10Dias);

    expect(cupo.disponible).toBe(false);
    expect(cupo.proximaFechaDisponible).toBe(fechaEsperada.toISOString());
  });

  it('está disponible si ya pasaron 30 días o más desde el último análisis', () => {
    const hace31Dias = new Date();
    hace31Dias.setDate(hace31Dias.getDate() - 31);

    expect(calcularCupoAnalisisCorte(hace31Dias)).toEqual({ disponible: true, proximaFechaDisponible: null });
  });
});
