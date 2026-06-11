import React, { useEffect, useCallback } from 'react';
import { FiScissors, FiUser, FiPhone, FiMail } from 'react-icons/fi';
import { AnimatedContainer } from '../../../components/common';
import { PublicHeader } from '../../../components/client/PublicHeader';
import { PublicFooter } from '../../../components/client/PublicFooter';
import {
  AccordionStep,
  BarberSelectionStep,
  ServiceSelectionStep,
  DateTimeStep,
  StickyBookingFooter,
  BookingSuccessModal,
} from '../../../components/client/booking';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchPublicBarbers,
  fetchServices,
  setSelectedBarber,
  setSelectedService,
  setSelectedDate,
  setSelectedTime,
  setClientData,
  setCurrentStep,
  submitAppointment,
  resetBooking,
  resetBookingFlow,
} from '../../../store/slices/bookingSlice';
import type { BookingStep, BarberPublic } from '../../../types/booking';

const getTodayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const BookingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    async: {
      barbers,
      services,
      availableSlots,
      isBooking,
      isConfirming,
      bookingError,
      confirmError,
      submitSuccess,
      createdAppointment,
    },
    flow: {
      currentStep,
      selectedBarber,
      selectedService,
      selectedDate,
      selectedTime,
      clientName,
      clientLastname,
      clientPhone,
      clientEmail,
    },
  } = useAppSelector((state) => state.booking);

  const [expandedStep, setExpandedStep] = React.useState<BookingStep>('barber');
  const [anyBarber, setAnyBarber] = React.useState(false);

  useEffect(() => {
    dispatch(fetchPublicBarbers());
    dispatch(fetchServices());
    return () => {
      dispatch(resetBooking());
    };
  }, [dispatch]);

  useEffect(() => {
    setExpandedStep(currentStep);
  }, [currentStep]);

  useEffect(() => {
    if (currentStep === 'datetime' && !selectedDate && selectedBarber) {
      dispatch(setSelectedDate(getTodayString()));
    }
  }, [currentStep, selectedDate, selectedBarber, dispatch]);

  const handleStepToggle = useCallback(
    (step: BookingStep) => {
      if (step === 'service' && !selectedBarber) return;
      if (step === 'datetime' && !selectedService) return;
      if (step === expandedStep) return;
      dispatch(setCurrentStep(step));
    },
    [selectedBarber, selectedService, expandedStep, dispatch]
  );

  const handleBarberSelect = useCallback(
    (barber: BarberPublic) => {
      setAnyBarber(false);
      dispatch(setSelectedBarber(barber));
    },
    [dispatch]
  );

  const handleAnyBarberSelect = useCallback(() => {
    setAnyBarber(true);
    if (barbers.length > 0) {
      dispatch(setSelectedBarber(barbers[0]));
    }
  }, [barbers, dispatch]);

  const handleSubmit = useCallback(() => {
    dispatch(submitAppointment());
  }, [dispatch]);

  const isFormValid =
    Boolean(selectedBarber) &&
    Boolean(selectedService) &&
    Boolean(selectedDate) &&
    Boolean(selectedTime) &&
    clientName.trim().length >= 2 &&
    clientLastname.trim().length >= 2 &&
    clientPhone.trim().length >= 7 &&
    clientEmail.includes('@');

  const barberSummary = anyBarber
    ? 'Cualquier barbero'
    : selectedBarber
      ? `${selectedBarber.name} ${selectedBarber.lastname}`
      : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <PublicHeader />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FF5C00]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FF5C00]/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-xl px-4 pb-32 pt-6 sm:px-6 sm:pt-8">
          <AnimatedContainer animation="fadeInDown" className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-3 py-1.5 text-[11px] text-[#8A8A8A] mb-3">
              <FiScissors className="text-[#FF5C00]" />
              Reservá tu turno online
            </div>
            <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-white sm:text-[32px]">
              Agendá tu cita en segundos
            </h1>
            <p className="mt-2 text-[13px] text-[#8A8A8A]">
              Elegí barbero, servicio y horario.
            </p>
          </AnimatedContainer>

          <div className="flex flex-col gap-2">
            <AccordionStep
              stepNumber={1}
              title="Tu barbero"
              summary={barberSummary}
              isExpanded={expandedStep === 'barber'}
              isCompleted={!!selectedBarber}
              isLocked={false}
              onToggle={() => handleStepToggle('barber')}
            >
              <BarberSelectionStep
                barbers={barbers}
                selectedBarber={selectedBarber}
                isLoading={isBooking}
                error={bookingError}
                onSelect={handleBarberSelect}
                onSelectAny={handleAnyBarberSelect}
                anyBarber={anyBarber}
              />
            </AccordionStep>

            <AccordionStep
              stepNumber={2}
              title="Servicio"
              summary={selectedService ? `${selectedService.name} · $${selectedService.price}` : null}
              isExpanded={expandedStep === 'service'}
              isCompleted={!!selectedService}
              isLocked={!selectedBarber}
              onToggle={() => handleStepToggle('service')}
            >
              <ServiceSelectionStep
                services={services}
                selectedService={selectedService}
                isLoading={isBooking}
                error={bookingError}
                onSelect={(svc) => dispatch(setSelectedService(svc))}
              />
            </AccordionStep>

            <AccordionStep
              stepNumber={3}
              title="Fecha, hora y datos"
              summary={
                selectedDate
                  ? `${selectedDate.split('-').reverse().join('/')}${selectedTime ? ` - ${selectedTime}` : ''}`
                  : null
              }
              isExpanded={expandedStep === 'datetime'}
              isCompleted={isFormValid}
              isLocked={!selectedService}
              onToggle={() => handleStepToggle('datetime')}
            >
              {selectedBarber && (
                <div className="divide-y divide-[#282828]">
                  <DateTimeStep
                    barberId={selectedBarber.id}
                    selectedDate={selectedDate}
                    selectedTime={selectedTime}
                    availableSlots={availableSlots}
                    isLoadingSlots={isBooking}
                    onSelectDate={(date) => dispatch(setSelectedDate(date))}
                    onSelectTime={(time) => dispatch(setSelectedTime(time))}
                  />

                  <div className="p-4 space-y-3">
                    <h3 className="text-[13px] font-semibold text-white">Tus datos</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                        <input
                          type="text"
                          placeholder="Nombre *"
                          value={clientName}
                          onChange={(e) =>
                            dispatch(setClientData({ name: e.target.value, lastname: clientLastname, phone: clientPhone, email: clientEmail }))
                          }
                          className="w-full rounded-[10px] border border-[#282828] bg-[#121212] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                        />
                      </div>

                      <div className="relative">
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                        <input
                          type="text"
                          placeholder="Apellido *"
                          value={clientLastname}
                          onChange={(e) =>
                            dispatch(setClientData({ name: clientName, lastname: e.target.value, phone: clientPhone, email: clientEmail }))
                          }
                          className="w-full rounded-[10px] border border-[#282828] bg-[#121212] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                        />
                      </div>

                      <div className="relative">
                        <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                        <input
                          type="tel"
                          placeholder="Teléfono *"
                          value={clientPhone}
                          onChange={(e) =>
                            dispatch(setClientData({ name: clientName, lastname: clientLastname, phone: e.target.value, email: clientEmail }))
                          }
                          className="w-full rounded-[10px] border border-[#282828] bg-[#121212] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                        />
                      </div>

                      <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8A8A8A]" />
                        <input
                          type="email"
                          placeholder="Email *"
                          value={clientEmail}
                          onChange={(e) =>
                            dispatch(setClientData({ name: clientName, lastname: clientLastname, phone: clientPhone, email: e.target.value }))
                          }
                          className="w-full rounded-[10px] border border-[#282828] bg-[#121212] py-2.5 pl-9 pr-3 text-[13px] text-white placeholder-[#8A8A8A] outline-none focus:border-[#FF5C00] transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </AccordionStep>
          </div>
        </div>
      </div>

      <StickyBookingFooter
        barber={selectedBarber}
        service={selectedService}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        isStepComplete={isFormValid}
        isConfirming={isConfirming}
        confirmError={confirmError}
        onSubmit={handleSubmit}
      />

      <BookingSuccessModal
        isOpen={submitSuccess}
        appointment={createdAppointment}
        onClose={() => dispatch(resetBookingFlow())}
      />

      <PublicFooter />
    </div>
  );
};

export default BookingPage;
