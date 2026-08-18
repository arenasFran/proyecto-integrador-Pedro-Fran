import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { motion, useReducedMotion } from 'framer-motion';
import type { BookingStep } from '../../../types/booking';

type Step = {
  key: BookingStep;
  label: string;
  number: number;
};

const steps: Step[] = [
  { key: 'barber', label: 'Barbero', number: 1 },
  { key: 'service', label: 'Servicio', number: 2 },
  { key: 'datetime', label: 'Fecha y hora', number: 3 },
];

const stepOrder: BookingStep[] = ['barber', 'service', 'datetime'];

interface StepIndicatorProps {
  currentStep: BookingStep;
  onStepClick?: (step: BookingStep) => void;
  completedSteps?: BookingStep[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick, completedSteps }) => {
  const currentIndex = stepOrder.indexOf(currentStep);
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex w-full items-center justify-center gap-0" aria-label="Progreso de la reserva">
      {steps.map((step, index) => {
        const isActive = index === currentIndex;
        const isCompleted = completedSteps ? completedSteps.includes(step.key) && !isActive : index < currentIndex;
        const isClickable = index <= currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <motion.button
                onClick={() => isClickable && onStepClick?.(step.key)}
                disabled={!isClickable}
                aria-label={`${step.label}${isCompleted ? ', completado' : isActive ? ', actual' : ', pendiente'}`}
                whileHover={isClickable && !isActive && !reduceMotion ? { y: -2 } : {}}
                whileTap={isClickable && !isActive && !reduceMotion ? { scale: 0.94 } : {}}
                className={`flex h-9 w-9 items-center justify-center rounded-[11px] text-[12px] font-bold outline-none transition-all duration-300 focus-visible:ring-2 focus-visible:ring-[#FF5C00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] ${
                  isActive
                    ? 'bg-[#FF5C00] text-white shadow-[0_7px_20px_rgba(255,92,0,0.25)]'
                    : isCompleted
                      ? 'bg-[#2A8D58] text-white'
                      : 'bg-[#1B1B1B] text-[#686868]'
                } ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <motion.span
                  key={isCompleted ? 'check' : 'number'}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.82 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                >
                  {isCompleted ? <FiCheck className="h-4 w-4" /> : step.number}
                </motion.span>
              </motion.button>
              <span
                   className={`mt-2 min-w-0 max-w-full break-words text-center text-[9px] font-semibold uppercase leading-tight tracking-[0.06em] transition-colors duration-300 sm:text-[10px] sm:tracking-[0.08em] ${
                  isActive ? 'text-[#FF8A4C]' : isCompleted ? 'text-[#64C98D]' : 'text-[#686868]'
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div className="relative mx-1 mt-[-20px] h-px min-w-3 flex-1 overflow-hidden bg-[#252525] sm:mx-3 sm:max-w-24">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-[#2A8D58]"
                  initial={false}
                  animate={{ width: (completedSteps ? completedSteps.includes(steps[index].key) : index < currentIndex) ? '100%' : '0%' }}
                  transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeOut' }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
