import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiCheck, FiChevronDown, FiEdit2, FiLock } from 'react-icons/fi';

interface AccordionStepProps {
  stepNumber: number;
  title: string;
  summary?: string | null;
  isExpanded: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const AccordionStep: React.FC<AccordionStepProps> = ({
  stepNumber,
  title,
  summary,
  isExpanded,
  isCompleted,
  isLocked,
  onToggle,
  children,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      data-testid={`accordion-${title}`}
      data-expanded={isExpanded}
      data-completed={isCompleted}
      data-locked={isLocked}
      className={`group overflow-hidden rounded-[18px] border transition-[border-color,background-color,box-shadow,opacity] duration-300 ${
        isExpanded
          ? 'border-[#FF5C00]/70 bg-[#171717] shadow-[0_18px_50px_rgba(0,0,0,0.22)]'
          : isCompleted
            ? 'border-[#2A2A2A] bg-[#111111] hover:border-[#3A3A3A]'
            : 'border-[#202020] bg-[#0D0D0D] opacity-65'
      }`}
    >
      <button
        id={`accordion-header-${stepNumber}`}
        onClick={onToggle}
        disabled={isLocked}
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${stepNumber}`}
        aria-label={isCompleted && !isExpanded ? `Editar ${title.toLowerCase()}` : title}
        className="flex min-h-[76px] w-full items-center justify-between gap-4 px-5 py-4 text-left outline-none transition-colors hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#FF5C00] disabled:cursor-not-allowed disabled:hover:bg-transparent sm:px-6"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[12px] font-bold transition-all duration-300 ${
              isCompleted || isExpanded
                ? 'bg-[#FF5C00] text-white shadow-[0_6px_20px_rgba(255,92,0,0.23)]'
                : 'bg-[#222222] text-[#686868]'
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isCompleted ? 'complete' : isLocked ? 'locked' : 'number'}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.55, rotate: -12 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.55 }}
                transition={{ type: 'spring', stiffness: 460, damping: 24 }}
              >
                {isCompleted ? <FiCheck className="h-4 w-4" /> : isLocked ? <FiLock className="h-3.5 w-3.5" /> : stepNumber}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="min-w-0">
            <span
              className={`block text-[14px] font-semibold transition-colors ${
                isExpanded ? 'text-white' : isCompleted ? 'text-[#E5E5E5]' : 'text-[#858585]'
              }`}
            >
              {title}
            </span>
            {summary && !isExpanded && (
              <span data-testid="step-summary" className="mt-0.5 block truncate text-[12px] text-[#777777]">
                · {summary}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isCompleted && !isExpanded && (
            <span className="flex items-center gap-1.5 rounded-full border border-[#FF5C00]/20 bg-[#FF5C00]/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-[#FF8A4C] transition-colors group-hover:border-[#FF5C00]/40">
              <FiEdit2 className="h-3.5 w-3.5" />
              <span>Editar</span>
            </span>
          )}
          {isExpanded && !isLocked && <FiChevronDown className="h-4 w-4 rotate-180 text-[#686868]" aria-hidden="true" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={`accordion-content-${stepNumber}`}
            role="region"
            aria-labelledby={`accordion-header-${stepNumber}`}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
          >
            <div className="border-t border-[#262626]">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
