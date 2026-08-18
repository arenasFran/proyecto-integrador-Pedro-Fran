import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAward, FiCreditCard, FiHome, FiUser, FiPhone, FiMail, FiScissors, FiClock, FiCalendar, FiArrowRight } from 'react-icons/fi';
import { Button, Input } from '../../common';
import { formatDate } from '../../../utils/formatDate';
import type { BarberPublic, PaymentMethod, Service } from '../../../types/booking';

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
  paymentMethod: PaymentMethod;
  hasActiveMembership: boolean;
  remainingCoupons: number;
  isConfirming: boolean;
  confirmError: string | null;
  emailRegisteredError?: boolean;
  isLoggedIn?: boolean;
  onChange: (data: { name: string; lastname: string; phone: string; email: string }) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onSubmit: () => void;
  onClose: () => void;
  onGoToLogin?: () => void;
}

function validateField(field: string, value: string): string | undefined {
  switch (field) {
    case 'name':
      if (!value.trim()) return 'El nombre es obligatorio';
      if (value.trim().length < 2) return 'Mínimo 2 caracteres';
      return undefined;
    case 'lastname':
      if (!value.trim()) return 'El apellido es obligatorio';
      if (value.trim().length < 2) return 'Mínimo 2 caracteres';
      return undefined;
    case 'phone':
      if (!value.trim()) return 'El teléfono es obligatorio';
      if (value.trim().length < 7) return 'Mínimo 7 dígitos';
      return undefined;
    case 'email':
      if (!value.trim()) return 'El email es obligatorio';
      if (!value.includes('@')) return 'Email inválido';
      return undefined;
    default:
      return undefined;
  }
}

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
  paymentMethod,
  hasActiveMembership,
  remainingCoupons,
  isConfirming,
  confirmError,
  emailRegisteredError = false,
  isLoggedIn,
  onChange,
  onPaymentMethodChange,
  onSubmit,
  onClose,
  onGoToLogin,
}) => {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalPrice = service?.price ?? 0;
  const barberName = barber ? `${barber.name} ${barber.lastname}` : '';

  const getFieldError = (field: string): string | undefined => {
    if (!touched[field]) return undefined;
    return errors[field];
  };

  const phoneValid = clientPhone.trim().length >= 7;
  const hasError = Object.values(errors).some(Boolean);
  const isValid = clientName.trim().length >= 2 && clientLastname.trim().length >= 2 && phoneValid && clientEmail.includes('@') && !hasError;

  const handleBlur = (field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error || '' }));
  };

  const handleFieldChange = (field: string, value: string) => {
    const data = {
      name: field === 'name' ? value : clientName,
      lastname: field === 'lastname' ? value : clientLastname,
      phone: field === 'phone' ? value : clientPhone,
      email: field === 'email' ? value : clientEmail,
    };
    onChange(data);

    if (touched[field]) {
    const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error || '' }));
    }
  };

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
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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
                <Input
                  label="Nombre"
                  required
                  icon={<FiUser className="w-3.5 h-3.5 text-[#8A8A8A]" />}
                  value={clientName}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={() => handleBlur('name', clientName)}
                  error={getFieldError('name')}
                  placeholder="Nombre"
                />
                <Input
                  label="Apellido"
                  required
                  icon={<FiUser className="w-3.5 h-3.5 text-[#8A8A8A]" />}
                  value={clientLastname}
                  onChange={(e) => handleFieldChange('lastname', e.target.value)}
                  onBlur={() => handleBlur('lastname', clientLastname)}
                  error={getFieldError('lastname')}
                  placeholder="Apellido"
                />
                <Input
                  label="Teléfono"
                  required
                  icon={<FiPhone className="w-3.5 h-3.5 text-[#8A8A8A]" />}
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone', clientPhone)}
                  error={getFieldError('phone')}
                  placeholder="598 91 234 567"
                />
                <Input
                  label="Email"
                  required
                  icon={<FiMail className="w-3.5 h-3.5 text-[#8A8A8A]" />}
                  type="email"
                  value={clientEmail}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  onBlur={() => handleBlur('email', clientEmail)}
                  error={getFieldError('email')}
                  placeholder="Email"
                />
              </div>
            </div>

            {confirmError && (
              <div className="mb-4">
                <p className="text-[12px] text-red-400">{confirmError}</p>
                {emailRegisteredError && onGoToLogin && (
                  <button
                    type="button"
                    onClick={onGoToLogin}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[#FF5C00] underline underline-offset-2 hover:text-[#FF7A2E]"
                  >
                    Iniciar sesión
                    <FiArrowRight className="shrink-0" size={13} />
                  </button>
                )}
              </div>
            )}

            <p className="mb-4 text-[12px] leading-snug text-[#8A8A8A]">
              Al confirmar aceptás la{' '}
              <a
                href="/cancelaciones"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF5C00] hover:underline"
              >
                Política de Cancelación y Reembolsos
              </a>
              .
            </p>

            <div className="mb-5">
              <p className="text-[13px] font-medium text-white mb-3">Método de pago</p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => onPaymentMethodChange('local')}
                  className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left text-[13px] transition-all ${
                    paymentMethod === 'local'
                      ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-white'
                      : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:border-[#555]'
                  }`}
                >
                  <FiHome className="shrink-0" size={16} />
                  <div>
                    <p className="font-medium">Pagar en el local</p>
                    <p className="text-[11px] text-[#6A6A6A]">Abonás al llegar a la barbería</p>
                  </div>
                </button>

                {hasActiveMembership && (
                  <button
                    type="button"
                    onClick={() => onPaymentMethodChange('memberPass')}
                    className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left text-[13px] transition-all ${
                      paymentMethod === 'memberPass'
                        ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-white'
                        : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:border-[#555]'
                    }`}
                  >
                    <FiAward className="shrink-0" size={16} />
                    <div>
                      <p className="font-medium">Usar membresía</p>
                      <p className="text-[11px] text-[#6A6A6A]">Te quedan {remainingCoupons} cupones</p>
                    </div>
                  </button>
                )}

                {!hasActiveMembership && isLoggedIn && (
                  <a
                    href="/mi-membresia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-[10px] border border-[#FF5C00]/30 bg-[#FF5C00]/5 px-4 py-3 text-left text-[13px] transition-all hover:border-[#FF5C00]/60 hover:bg-[#FF5C00]/10"
                  >
                    <FiAward className="shrink-0 text-[#FF5C00]" size={16} />
                    <div>
                      <p className="font-medium text-white">¿Tenés membresía?</p>
                      <p className="text-[11px] text-[#8A8A8A]">
                        Ahorrá en cada corte y obtené descuentos en productos!{' '}
                        <br/> <span className="text-[#FF5C00]">Ver membresía →</span>
                      </p>
                    </div>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onPaymentMethodChange('online')}
                  className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left text-[13px] transition-all ${
                    paymentMethod === 'online'
                      ? 'border-[#FF5C00] bg-[#FF5C00]/10 text-white'
                      : 'border-[#282828] bg-[#1A1A1A] text-[#8A8A8A] hover:border-[#555]'
                  }`}
                >
                  <FiCreditCard className="shrink-0" size={16} />
                  <div>
                    <p className="font-medium">Pagar online</p>
                    <p className="text-[11px] text-[#6A6A6A]">Aboná con MercadoPago</p>
                  </div>
                </button>
              </div>
            </div>

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
