import type { FC } from 'react';
import { FiScissors } from 'react-icons/fi';
import type { AnalisisCorteResultado } from '../../types/analisisCorte';
import { CorteEjemploImagen } from './CorteEjemploImagen';

type RecomendacionDetalleProps = {
  resultado: AnalisisCorteResultado;
  analisisId: string;
  fotoUrl?: string | null;
};

export const RecomendacionDetalle: FC<RecomendacionDetalleProps> = ({ resultado, analisisId, fotoUrl }) => {
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-6">
        {fotoUrl && (
          <img
            src={fotoUrl}
            alt="Tu foto"
            className="h-40 w-40 rounded-[12px] object-cover border border-[#282828] mx-auto sm:mx-0"
          />
        )}
        <div className="flex-1">
          <p className="text-[12px] text-[#8A8A8A]">Forma de cara detectada</p>
          <p className="text-[18px] font-bold text-white capitalize mb-3">{resultado.formaCara}</p>
          <p className="text-[13px] text-[#8A8A8A]">{resultado.explicacionGeneral}</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {resultado.cortesRecomendados.map((corte, i) => (
          <div key={i} className="rounded-[12px] bg-[#1A1A1A] border border-[#282828] p-4 flex gap-4">
            <CorteEjemploImagen
              analisisId={analisisId}
              corteIndex={i}
              nombreCorte={corte.nombreCorte}
              imagenEjemploUrl={corte.imagenEjemploUrl}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <p className="text-[14px] font-semibold text-white">{corte.nombreCorte}</p>
                <span className="shrink-0 text-[11px] text-[#FF5C00] flex items-center gap-1">
                  <FiScissors />
                  {corte.servicioSugerido}
                </span>
              </div>
              <p className="text-[12px] text-[#8A8A8A] mb-1">{corte.descripcion}</p>
              <p className="text-[12px] text-[#8A8A8A] italic">{corte.razon}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
