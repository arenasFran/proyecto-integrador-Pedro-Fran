import React from 'react';
import { motion } from 'framer-motion';

export const FaceScanLoader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-[#282828] bg-[#121212] p-10 text-center">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 160 160" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <clipPath id="face-clip">
              <path d="M80 18c-30 0-46 22-46 52 0 34 22 66 46 66s46-32 46-66c0-30-16-52-46-52Z" />
            </clipPath>
          </defs>

          <path
            d="M80 18c-30 0-46 22-46 52 0 34 22 66 46 66s46-32 46-66c0-30-16-52-46-52Z"
            stroke="#282828"
            strokeWidth={2}
          />
          <path d="M58 66c0-4 3-7 6-7s6 3 6 7" stroke="#282828" strokeWidth={2} strokeLinecap="round" />
          <path d="M90 66c0-4 3-7 6-7s6 3 6 7" stroke="#282828" strokeWidth={2} strokeLinecap="round" />
          <path d="M78 78v14c0 3 2 5 5 5" stroke="#282828" strokeWidth={2} strokeLinecap="round" />
          <path d="M64 108c6 6 26 6 32 0" stroke="#282828" strokeWidth={2} strokeLinecap="round" />

          <g clipPath="url(#face-clip)">
            <motion.rect
              x={26}
              width={108}
              height={18}
              fill="url(#scan-gradient)"
              initial={{ y: 10 }}
              animate={{ y: [10, 140, 10] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </g>

          <defs>
            <linearGradient id="scan-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5C00" stopOpacity={0} />
              <stop offset="50%" stopColor="#FF5C00" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#FF5C00" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <p className="mt-6 text-[15px] font-semibold text-white">Analizando tu foto...</p>
      <p className="mt-1 max-w-xs text-[13px] text-[#8A8A8A]">
        Puede tardar unos segundos. No hace falta que esperes activamente.
      </p>
    </div>
  );
};
