import React from 'react';
import { FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
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
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onStepClick }) => {
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isClickable = index <= currentIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center">
              <motion.button
                onClick={() => isClickable && onStepClick?.(step.key)}
                disabled={!isClickable}
                whileHover={isClickable && !isActive ? { scale: 1.05 } : {}}
                whileTap={isClickable && !isActive ? { scale: 0.95 } : {}}
                className={`
                  flex h-[32px] w-[32px] items-center justify-center rounded-full text-[13px] font-bold
                  transition-all duration-300
                  ${isActive ? 'bg-[#FF5C00] text-white shadow-[0_0_15px_rgba(255,92,0,0.3)]' : ''}
                  ${isCompleted ? 'bg-[#22C55E] text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-[#242424] text-[#8A8A8A]' : ''}
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                `}
              >
                {isCompleted ? (
                  <FiCheck className="w-4 h-4" />
                ) : (
                  step.number
                )}
              </motion.button>
              <span
                className={`mt-1.5 text-[11px] font-medium transition-colors duration-300
                  ${isActive ? 'text-[#FF5C00]' : ''}
                  ${isCompleted ? 'text-[#22C55E]' : ''}
                  ${!isActive && !isCompleted ? 'text-[#8A8A8A]' : ''}
                `}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`mx-2 mt-[-20px] h-[2px] w-12 sm:w-20 transition-colors duration-300
                  ${index < currentIndex ? 'bg-[#22C55E]' : 'bg-[#282828]'}
                `}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
