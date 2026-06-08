import React, { useEffect } from 'react';
import { FiScissors } from 'react-icons/fi';
import { AnimatedContainer } from '../../../components/common';
import { PublicHeader } from '../../../components/client/PublicHeader';
import { PublicFooter } from '../../../components/client/PublicFooter';
import {
  StepIndicator,
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
  setCurrentStep,
  submitAppointment,
  resetBooking,
} from '../../../store/slices/bookingSlice';
import type { BookingStep } from '../../../types/booking';

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
    },
  } = useAppSelector((state) => state.booking);

  useEffect(() => {
    dispatch(fetchPublicBarbers());
    dispatch(fetchServices());
    return () => {
      dispatch(resetBooking());
    };
  }, [dispatch]);

  const handleStepClick = (step: BookingStep) => {
    if (step === 'service' && !selectedBarber) return;
    if (step === 'datetime' && !selectedService) return;
    dispatch(setCurrentStep(step));
  };

  const handleSubmitAppointment = async (clientData: {
    name: string;
    lastname: string;
    phone?: string;
    email?: string;
  }) => {
    if (!selectedBarber || !selectedService || !selectedDate || !selectedTime) return;

    await dispatch(
      submitAppointment({
        barberId: selectedBarber.id,
        serviceId: selectedService.id,
        date: selectedDate,
        startTime: selectedTime,
        clientName: clientData.name,
        clientLastname: clientData.lastname,
        clientPhone: clientData.phone,
        clientEmail: clientData.email,
      })
    );
  };

  const isStepComplete = Boolean(
    selectedBarber && selectedService && selectedDate && selectedTime
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <PublicHeader />

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#FF5C00]/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#FF5C00]/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-8 sm:pt-12">
          <AnimatedContainer animation="fadeInDown" className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#282828] bg-[#1A1A1A] px-4 py-2 text-[12px] text-[#8A8A8A] mb-4">
              <FiScissors className="text-[#FF5C00]" />
              Reservá tu turno online
            </div>
            <h1 className="text-[32px] font-extrabold tracking-[-0.02em] text-white sm:text-[42px]">
              Agendá tu cita en segundos
            </h1>
            <p className="mt-3 text-[14px] text-[#8A8A8A] max-w-xl mx-auto sm:text-[15px]">
              Elegí tu barbero, seleccioná el servicio y encontrá el horario perfecto para vos.
            </p>
          </AnimatedContainer>

          <div className="mb-10">
            <StepIndicator currentStep={currentStep} onStepClick={handleStepClick} />
          </div>

          {currentStep === 'barber' && (
            <AnimatedContainer animation="fadeInUp" key="barber-step">
              <h2 className="text-[18px] font-bold text-white mb-5">Seleccioná tu barbero</h2>
              <BarberSelectionStep
                barbers={barbers}
                selectedBarber={selectedBarber}
                isLoading={isBooking}
                error={bookingError}
                onSelect={(barber) => dispatch(setSelectedBarber(barber))}
              />
            </AnimatedContainer>
          )}

          {currentStep === 'service' && (
            <AnimatedContainer animation="fadeInUp" key="service-step">
              <h2 className="text-[18px] font-bold text-white mb-5">Elegí el servicio</h2>
              <ServiceSelectionStep
                services={services}
                selectedService={selectedService}
                isLoading={isBooking}
                error={bookingError}
                onSelect={(svc) => dispatch(setSelectedService(svc))}
              />
            </AnimatedContainer>
          )}

          {currentStep === 'datetime' && selectedBarber && (
            <AnimatedContainer animation="fadeInUp" key="datetime-step">
              <h2 className="text-[18px] font-bold text-white mb-5">Agendá tu cita</h2>
              <DateTimeStep
                barberId={selectedBarber.id}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                availableSlots={availableSlots}
                isLoadingSlots={isBooking}
                onSelectDate={(date) => dispatch(setSelectedDate(date))}
                onSelectTime={(time) => dispatch(setSelectedTime(time))}
              />
            </AnimatedContainer>
          )}
        </div>
      </div>

      <StickyBookingFooter
        barber={selectedBarber}
        service={selectedService}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        isStepComplete={isStepComplete}
        isConfirming={isConfirming}
        confirmError={confirmError}
        onSubmit={handleSubmitAppointment}
      />

      <BookingSuccessModal
        isOpen={submitSuccess}
        appointment={createdAppointment}
        onClose={() => dispatch(resetBooking())}
      />

      <PublicFooter />
    </div>
  );
};

export default BookingPage;
