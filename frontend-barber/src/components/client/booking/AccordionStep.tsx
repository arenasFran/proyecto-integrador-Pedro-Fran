import React from 'react';
import { motion } from 'framer-motion';
import { FiCheck, FiEdit2, FiLock } from 'react-icons/fi';

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
  return (
    <motion.div
      layout
      className={`rounded-[12px] border transition-all duration-300 overflow-hidden ${
        isExpanded
          ? 'border-[#FF5C00] bg-[#1A1A1A] shadow-[0_0_15px_rgba(255,92,0,0.08)]'
          : isCompleted
            ? 'border-[#282828] bg-[#1A1A1A]'
            : 'border-[#282828] bg-[#121212] opacity-50'
      }`}
    >
      <button
        id={`accordion-header-${stepNumber}`}
        onClick={onToggle}
        disabled={isLocked}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`accordion-content-${stepNumber}`}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300 ${
              isCompleted
                ? 'bg-[#22C55E] text-white'
                : isExpanded
                  ? 'bg-[#FF5C00] text-white shadow-[0_0_10px_rgba(255,92,0,0.3)]'
                  : 'bg-[#242424] text-[#8A8A8A]'
            }`}
          >
            {isCompleted ? <FiCheck className="w-3 h-3" /> : isLocked ? <FiLock className="w-3 h-3" /> : stepNumber}
          </div>

          <span
            className={`text-[13px] font-semibold transition-colors ${
              isExpanded ? 'text-[#FF5C00]' : isCompleted ? 'text-white' : 'text-[#8A8A8A]'
            }`}
          >
            {title}
          </span>

          {summary && !isExpanded && (
            <span className="text-[12px] text-[#8A8A8A] truncate hidden sm:inline">· {summary}</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {summary && !isExpanded && (
            <span className="text-[12px] text-[#8A8A8A] truncate sm:hidden">{summary}</span>
          )}
          {isCompleted && !isExpanded && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[#FF5C00] hover:text-[#FF7A2A] transition-colors">
              <FiEdit2 className="w-3 h-3" />
              <span className="hidden sm:inline">Editar</span>
            </span>
          )}
        </div>
      </button>

      {isExpanded && (
        <motion.div
          id={`accordion-content-${stepNumber}`}
          role="region"
          aria-labelledby={`accordion-header-${stepNumber}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
        >
          <div className="border-t border-[#282828]">{children}</div>
        </motion.div>
      )}
    </motion.div>
  );
};
