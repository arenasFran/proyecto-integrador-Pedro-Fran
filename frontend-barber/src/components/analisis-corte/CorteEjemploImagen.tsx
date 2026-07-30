import { useEffect, useRef } from 'react';
import type { FC } from 'react';
import { motion } from 'framer-motion';
import { FiImage } from 'react-icons/fi';
import { useGenerarImagenEjemploCorteMutation } from '../../services/analisisCorteApi';

type CorteEjemploImagenProps = {
  analisisId: string;
  corteIndex: number;
  nombreCorte: string;
  imagenEjemploUrl?: string;
};

export const CorteEjemploImagen: FC<CorteEjemploImagenProps> = ({
  analisisId,
  corteIndex,
  nombreCorte,
  imagenEjemploUrl,
}) => {
  const [generarImagen, { data, isLoading, isError }] = useGenerarImagenEjemploCorteMutation();
  const disparado = useRef(false);

  useEffect(() => {
    // Ya está generada y persistida (ej. se reabrió el historial): no se vuelve a pagar por generarla.
    if (imagenEjemploUrl) return;
    if (disparado.current) return;
    disparado.current = true;
    generarImagen({ analisisId, corteIndex });
    // Solo se dispara una vez por card, al montarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const url = imagenEjemploUrl ?? data?.imagenUrl;

  if (url) {
    return (
      <img
        src={url}
        alt={`Ejemplo del corte ${nombreCorte}`}
        className="h-24 w-24 shrink-0 rounded-[10px] object-cover border border-[#282828] bg-white"
      />
    );
  }

  if (isError) return null;

  return (
    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[10px] border border-[#282828] bg-[#1A1A1A] flex items-center justify-center">
      {isLoading && (
        <motion.div
          className="absolute inset-x-0 h-6 bg-gradient-to-b from-transparent via-[#FF5C00]/40 to-transparent"
          initial={{ y: -24 }}
          animate={{ y: [-24, 96, -24] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <FiImage className="text-[#3A3A3A] text-xl" />
    </div>
  );
};
