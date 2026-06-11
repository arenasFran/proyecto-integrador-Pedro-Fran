import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiScissors, FiUser, FiClock, FiCalendar, FiCreditCard } from 'react-icons/fi';
import { Button } from '../../common';
import type { Appointment } from '../../../types/booking';

interface BookingSuccessModalProps {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
  isOpen,
  appointment,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && appointment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm rounded-[24px] border border-[#282828] bg-[#121212] p-8 text-center shadow-2xl"
          >
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#22C55E]/20">
              <FiCheck className="w-8 h-8 text-[#22C55E]" />
            </div>

            <h2 className="text-[20px] font-bold text-white mb-1">Reserva confirmada</h2>
            <p className="text-[13px] text-[#8A8A8A] mb-6">
              Turno confirmado &mdash; Pago pendiente (en local)
            </p>

            <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 space-y-3 text-left mb-6">
              <div className="flex items-center gap-3">
                <FiScissors className="w-4 h-4 text-[#FF5C00] shrink-0" />
                <span className="text-[13px] text-white">{appointment.serviceName}</span>
              </div>
              <div className="flex items-center gap-3">
                <FiUser className="w-4 h-4 text-[#FF5C00] shrink-0" />
                <span className="text-[13px] text-white">
                  {appointment.clientName} {appointment.clientLastname}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <FiCalendar className="w-4 h-4 text-[#FF5C00] shrink-0" />
                <span className="text-[13px] text-white">{formatDate(appointment.date)}</span>
              </div>
              <div className="flex items-center gap-3">
                <FiClock className="w-4 h-4 text-[#FF5C00] shrink-0" />
                <span className="text-[13px] text-white">
                  {appointment.startTime} - {appointment.endTime}
                </span>
              </div>
            </div>

            <Button onClick={onClose} className="w-full" size="md">
              Volver al inicio
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
