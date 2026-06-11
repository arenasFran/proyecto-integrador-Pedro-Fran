import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiClock, FiUser, FiCalendar, FiArrowUp } from 'react-icons/fi';
import { Button } from '../../common';
import type { BarberPublic, Service } from '../../../types/booking';

interface StickyBookingFooterProps {
  barber: BarberPublic | null;
  service: Service | null;
  selectedDate: string | null;
  selectedTime: string | null;
  isStepComplete: boolean;
  isConfirming: boolean;
  confirmError: string | null;
  onSubmit: () => void;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const StickyBookingFooter: React.FC<StickyBookingFooterProps> = ({
  barber,
  service,
  selectedDate,
  selectedTime,
  isStepComplete,
  isConfirming,
  confirmError,
  onSubmit,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleConfirm = () => {
    if (!isStepComplete) return;
    onSubmit();
  };

  const totalPrice = service?.price ?? 0;
  const totalDuration = barber?.slotDuration ?? 0;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#282828] bg-[#121212] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex w-full items-center justify-between lg:hidden mb-2"
            >
              <span className="text-[12px] text-[#8A8A8A] font-medium">
                {barber || service ? 'Resumen de reserva' : 'Completá los pasos para reservar'}
              </span>
              <FiArrowUp
                className={`text-[#8A8A8A] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>

            <div className="hidden lg:flex lg:items-center lg:justify-between lg:gap-4">
              <div className="flex items-center gap-6">
                {barber && (
                  <div className="flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-[#FF5C00]" />
                    <span className="text-[13px] text-white">{barber.name} {barber.lastname}</span>
                  </div>
                )}

                {service && (
                  <div className="flex items-center gap-2">
                    <FiClock className="w-4 h-4 text-[#FF5C00]" />
                    <span className="text-[13px] text-white">{service.name}</span>
                    <span className="text-[12px] text-[#8A8A8A]">· {totalDuration} min</span>
                  </div>
                )}

                {selectedDate && (
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-[#FF5C00]" />
                    <span className="text-[13px] text-white">
                      {formatDate(selectedDate)} {selectedTime ? `- ${selectedTime}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                {service && (
                  <span className="text-[18px] font-bold text-white">${totalPrice}</span>
                )}
                <Button
                  onClick={handleConfirm}
                  disabled={!isStepComplete}
                  loading={isConfirming}
                  size="md"
                >
                  Confirmar reserva
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {(isExpanded || window.innerWidth >= 1024) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="lg:hidden"
                >
                  <div className="flex flex-col gap-3 pt-2 pb-1">
                    {barber && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiUser className="w-4 h-4 text-[#FF5C00]" />
                          <span className="text-[13px] text-white">{barber.name} {barber.lastname}</span>
                        </div>
                      </div>
                    )}

                    {service && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FiClock className="w-4 h-4 text-[#FF5C00]" />
                          <span className="text-[13px] text-white">{service.name} · {totalDuration} min</span>
                        </div>
                        <span className="text-[16px] font-bold text-white">${totalPrice}</span>
                      </div>
                    )}

                    {selectedDate && (
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-4 h-4 text-[#FF5C00]" />
                        <span className="text-[13px] text-white">
                          {formatDate(selectedDate)} {selectedTime ? `- ${selectedTime}` : ''}
                        </span>
                      </div>
                    )}

                    <Button
                      onClick={handleConfirm}
                      disabled={!isStepComplete}
                      loading={isConfirming}
                      className="w-full mt-2"
                    >
                      Confirmar reserva
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {confirmError && (
            <div className="pb-3">
              <p className="text-[12px] text-red-400">{confirmError}</p>
            </div>
          )}
        </div>
      </div>

    </>
  );
};
