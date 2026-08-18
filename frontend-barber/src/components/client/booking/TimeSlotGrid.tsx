import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiAlertTriangle, FiCheck, FiClock, FiSun } from 'react-icons/fi';
import type { SlotsReason } from '../../../types/professional';
import { formatDate } from '../../../utils/formatDate';

const emptySlotsMessage: Record<SlotsReason, string> = {
  'day-off': 'Este día no se trabaja.',
  'already-past': 'Ya pasaron los horarios de hoy. Elegí otro día.',
  'fully-booked': 'No quedan horarios libres este día.',
};

interface TimeSlotGridProps {
  slots: string[];
  selectedTime: string | null;
  selectedDate: string | null;
  isLoading: boolean;
  error?: boolean;
  reason?: SlotsReason;
  onSelect: (time: string) => void;
}

const getPeriod = (time: string): 'Mañana' | 'Tarde' => Number(time.slice(0, 2)) < 13 ? 'Mañana' : 'Tarde';

const slotContentVariants = {
  initial: { opacity: 0, y: 12, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.985 },
};

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  slots,
  selectedTime,
  selectedDate,
  isLoading,
  error,
  reason,
  onSelect,
}) => {
  const reduceMotion = useReducedMotion();

  const statePanel = (icon: React.ReactNode, message: string, detail?: string) => (
    <div className="flex min-h-[210px] flex-col items-center justify-center gap-3 rounded-[15px] border border-[#292929] bg-[#111111] p-5 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#242424] text-[#8A8A8A]">{icon}</span>
      <div>
        <p className="text-[13px] font-semibold text-[#D6D6D6]">{message}</p>
        {detail && <p className="mt-1 max-w-[230px] text-[11px] leading-5 text-[#777777]">{detail}</p>}
      </div>
    </div>
  );

  const groups = (['Mañana', 'Tarde'] as const).map((period) => ({ period, slots: slots.filter((slot) => getPeriod(slot) === period) })).filter((group) => group.slots.length > 0);

  const contentTransition = { duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="min-h-[276px] w-full min-w-0 rounded-[17px] border border-[#292929] bg-[#151515] p-3 sm:p-5">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold text-white">Horarios</h3>
          <AnimatePresence mode="wait" initial={false}>
            {selectedDate && (
              <motion.p key={selectedDate} initial={reduceMotion ? false : { opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={reduceMotion ? undefined : { opacity: 0, x: 6 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className="mt-1 text-[11px] text-[#777777]">
                {formatDate(selectedDate)}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.span key="loading" initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? undefined : { opacity: 0, scale: 0.8 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="flex h-6 w-6 items-center justify-center rounded-full bg-[#242424] text-[#FF8A4C]">
              <motion.span animate={reduceMotion ? undefined : { rotate: 360 }} transition={reduceMotion ? undefined : { duration: 1.1, repeat: Infinity, ease: 'linear' }}><FiClock className="h-3.5 w-3.5" /></motion.span>
            </motion.span>
          ) : slots.length > 0 ? (
            <motion.span key={`count-${slots.length}`} initial={reduceMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className="rounded-full bg-[#242424] px-2.5 py-1 text-[10px] font-semibold text-[#A0A0A0]">({slots.length} disponibles)</motion.span>
          ) : (
            <FiClock className="mt-1 h-4 w-4 text-[#666666]" aria-hidden="true" />
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div key="loading" variants={slotContentVariants} initial={reduceMotion ? false : 'initial'} animate="animate" exit={reduceMotion ? undefined : 'exit'} transition={contentTransition} className="min-h-[210px]">
            <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => <motion.div key={index} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: [0.45, 0.85, 0.45] }} transition={reduceMotion ? undefined : { duration: 1.15, repeat: Infinity, delay: index * 0.045 }} className="h-11 rounded-[11px] bg-[#242424]" />)}
            </div>
            <p className="mt-5 text-center text-[11px] text-[#777777]">Buscando horarios para {selectedDate ? formatDate(selectedDate) : 'la fecha elegida'}...</p>
          </motion.div>
        ) : error ? (
          <motion.div key="error" variants={slotContentVariants} initial={reduceMotion ? false : 'initial'} animate="animate" exit={reduceMotion ? undefined : 'exit'} transition={contentTransition}>
            {statePanel(<FiAlertTriangle className="h-5 w-5 text-[#FF8A4C]" />, 'No pudimos cargar los horarios.', 'Podés elegir otra fecha o volver a intentarlo.')}
            <span className="sr-only">No pudimos cargar los horarios. Intentá de nuevo.</span>
          </motion.div>
        ) : !selectedDate && slots.length === 0 ? (
          <motion.div key="no-date" variants={slotContentVariants} initial={reduceMotion ? false : 'initial'} animate="animate" exit={reduceMotion ? undefined : 'exit'} transition={contentTransition}>
            {statePanel(<FiClock className="h-5 w-5" />, 'Elegí un día primero', 'Los horarios disponibles aparecerán acá.')}
            <span className="sr-only">Seleccioná una fecha</span>
          </motion.div>
        ) : slots.length === 0 ? (
          <motion.div key={`empty-${selectedDate}-${reason ?? 'none'}`} variants={slotContentVariants} initial={reduceMotion ? false : 'initial'} animate="animate" exit={reduceMotion ? undefined : 'exit'} transition={contentTransition}>
            {statePanel(<FiClock className="h-5 w-5" />, reason ? emptySlotsMessage[reason] : 'Sin horarios disponibles', 'Probá seleccionando otro día en el calendario.')}
          </motion.div>
        ) : (
          <motion.div key={`slots-${selectedDate}`} variants={slotContentVariants} initial={reduceMotion ? false : 'initial'} animate="animate" exit={reduceMotion ? undefined : 'exit'} transition={contentTransition} className="space-y-5">
            {groups.map(({ period, slots: periodSlots }, groupIndex) => (
              <motion.div key={period} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : groupIndex * 0.08, duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}>
                <p className="mb-2.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#777777]"><FiSun className={period === 'Tarde' ? 'h-3 w-3 text-[#FF8A4C]' : 'h-3 w-3 text-[#D8A45C]'} />{period}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {periodSlots.map((time, index) => {
                    const isSelected = selectedTime === time;
                    return (
                      <motion.button
                        key={time}
                        onClick={() => onSelect(time)}
                        type="button"
                        aria-pressed={isSelected}
                        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: reduceMotion ? 0 : groupIndex * 0.08 + index * 0.035, duration: reduceMotion ? 0 : 0.25, ease: 'easeOut' }}
                        whileHover={!reduceMotion ? { y: -2 } : {}}
                        whileTap={!reduceMotion ? { scale: 0.96 } : {}}
                        className={`relative min-h-[44px] overflow-hidden rounded-[11px] border px-2 py-2.5 text-[13px] font-semibold outline-none transition-[border-color,box-shadow,color] duration-200 focus-visible:ring-2 focus-visible:ring-[#FF5C00] ${isSelected ? 'border-[#FF5C00] text-white shadow-[0_8px_20px_rgba(255,92,0,0.2)]' : 'border-[#303030] bg-[#202020] text-[#E3E3E3] hover:border-[#FF5C00]/70 hover:bg-[#28221F]'}`}
                      >
                        {isSelected && <motion.span layoutId="selected-time-slot" transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="absolute inset-0 rounded-[10px] bg-[#FF5C00]" />}
                        <span className="relative z-10 flex items-center justify-center gap-1.5"><span>{time}</span>{isSelected && <motion.span initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}><FiCheck className="h-3 w-3" /></motion.span>}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
