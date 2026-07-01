import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUser, FiClock, FiCalendar, FiPhone, FiMail, FiArrowRight } from 'react-icons/fi';
import { Button } from '../../common';
import { formatDate } from '../../../utils/formatDate';
import type { BarberPublic, Service } from '../../../types/booking';

interface BookingConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; lastname: string; phone: string; email: string }) => void;
  barber: BarberPublic | null;
  service: Service | null;
  selectedDate: string | null;
  selectedTime: string | null;
  totalPrice: number;
  totalDuration: number;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  barber,
  service,
  selectedDate,
  selectedTime,
  totalPrice,
  totalDuration,
}) => {
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lastname.trim() || !phone.trim() || !email.trim()) return;
    onSubmit({
      name: name.trim(),
      lastname: lastname.trim(),
      phone: phone.trim(),
      email: email.trim(),
    });
  };

  const isValid = name.trim().length >= 2 && lastname.trim().length >= 2 && phone.trim().length >= 7 && email.includes('@');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md rounded-[24px] border border-[#282828] bg-[#121212] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1A1A1A] text-[#8A8A8A] hover:text-white transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>

            <h2 className="text-[18px] font-bold text-white mb-1">Confirmar reserva</h2>
            <p className="text-[13px] text-[#8A8A8A] mb-6">Revisá los detalles de tu turno</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="rounded-[16px] border border-[#282828] bg-[#1A1A1A] p-4 space-y-3">
                {barber && (
                  <div className="flex items-center gap-3">
                    <FiUser className="w-4 h-4 text-[#FF5C00] shrink-0" />
                    <span className="text-[13px] text-white">{barber.name} {barber.lastname}</span>
                  </div>
                )}

                {service && (
                  <div className="flex items-center gap-3">
                    <FiClock className="w-4 h-4 text-[#FF5C00] shrink-0" />
                    <span className="text-[13px] text-white">{service.name} · {totalDuration} min</span>
                    <span className="ml-auto text-[15px] font-bold text-[#FF5C00]">${totalPrice}</span>
                  </div>
                )}

                {selectedDate && (
                  <div className="flex items-center gap-3">
                    <FiCalendar className="w-4 h-4 text-[#FF5C00] shrink-0" />
                    <span className="text-[13px] text-white">
                      {formatDate(selectedDate)} {selectedTime ? `a las ${selectedTime}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
                  <input
                    type="text"
                    placeholder="Nombre *"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-3 pl-10 pr-4 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>

                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
                  <input
                    type="text"
                    placeholder="Apellido *"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    required
                    className="w-full rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-3 pl-10 pr-4 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>

                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-3 pl-10 pr-4 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>

                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-[12px] border border-[#282828] bg-[#1A1A1A] py-3 pl-10 pr-4 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={!isValid}
                icon={FiArrowRight}
                iconPosition="right"
                className="w-full"
                size="md"
              >
                Confirmar reserva
              </Button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
