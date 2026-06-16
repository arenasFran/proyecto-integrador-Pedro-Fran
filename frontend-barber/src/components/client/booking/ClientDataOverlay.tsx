import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUser, FiPhone, FiMail, FiScissors, FiClock, FiCalendar } from 'react-icons/fi';
import { Button } from '../../common';
import type { BarberPublic, Service } from '../../../types/booking';

interface ClientDataOverlayProps {
  isOpen: boolean;
  barber: BarberPublic | null;
  service: Service | null;
  selectedDate: string | null;
  selectedTime: string | null;
  clientName: string;
  clientLastname: string;
  clientPhone: string;
  clientEmail: string;
  isConfirming: boolean;
  confirmError: string | null;
  isLoggedIn?: boolean;
  onChange: (data: { name: string; lastname: string; phone: string; email: string }) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export const ClientDataOverlay: React.FC<ClientDataOverlayProps> = ({
  isOpen,
  barber,
  service,
  selectedDate,
  selectedTime,
  clientName,
  clientLastname,
  clientPhone,
  clientEmail,
  isConfirming,
  confirmError,
  isLoggedIn,
  onChange,
  onSubmit,
  onClose,
}) => {
  const totalPrice = service?.price ?? 0;
  const barberName = barber ? `${barber.name} ${barber.lastname}` : '';
  const phoneValid = isLoggedIn ? clientPhone.trim().length >= 7 || clientPhone.trim().length === 0 : clientPhone.trim().length >= 7;
  const isValid = clientName.trim().length >= 2 && clientLastname.trim().length >= 2 && phoneValid && clientEmail.includes('@');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-[20px] sm:rounded-[16px] border border-[#282828] bg-[#121212] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-[18px] font-bold text-white mb-1">Casi listo</h2>
            <p className="text-[13px] text-[#8A8A8A] mb-5">
              {isLoggedIn ? 'Tus datos' : 'Completá tus datos para confirmar'}
            </p>

            <div className="rounded-[12px] border border-[#282828] bg-[#1A1A1A] p-4 space-y-2.5 mb-5">
              {barber && (
                <div className="flex items-center gap-2.5 text-[13px]">
                  <FiScissors className="w-4 h-4 text-[#FF5C00] shrink-0" />
                  <span className="text-white">{barberName}</span>
                </div>
              )}
              {service && (
                <div className="flex items-center gap-2.5 text-[13px]">
                  <FiClock className="w-4 h-4 text-[#FF5C00] shrink-0" />
                  <span className="text-white">{service.name} · ${totalPrice}</span>
                </div>
              )}
              {selectedDate && (
                <div className="flex items-center gap-2.5 text-[13px]">
                  <FiCalendar className="w-4 h-4 text-[#FF5C00] shrink-0" />
                  <span className="text-white">
                    {formatDate(selectedDate)}{selectedTime ? ` - ${selectedTime}` : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                  <input
                    type="text"
                    placeholder="Nombre *"
                    value={clientName}
                    onChange={(e) => onChange({ name: e.target.value, lastname: clientLastname, phone: clientPhone, email: clientEmail })}
                    className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                  <input
                    type="text"
                    placeholder="Apellido *"
                    value={clientLastname}
                    onChange={(e) => onChange({ name: clientName, lastname: e.target.value, phone: clientPhone, email: clientEmail })}
                    className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>
                <div className="relative">
                  <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                  <input
                    type="tel"
                    placeholder="Teléfono *"
                    value={clientPhone}
                    onChange={(e) => onChange({ name: clientName, lastname: clientLastname, phone: e.target.value, email: clientEmail })}
                    className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                  <input
                    type="email"
                    placeholder="Email *"
                    value={clientEmail}
                    onChange={(e) => onChange({ name: clientName, lastname: clientLastname, phone: clientPhone, email: e.target.value })}
                    className="w-full rounded-[10px] border border-[#282828] bg-[#1A1A1A] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>
              </div>
            </div>

            {confirmError && (
              <p className="text-[12px] text-red-400 mb-4">{confirmError}</p>
            )}

            <Button
              onClick={onSubmit}
              loading={isConfirming}
              disabled={!isValid}
              className="w-full"
            >
              Confirmar reserva
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
