import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiScissors } from 'react-icons/fi';
import { AnimatedContainer, AppFooter } from '../../../components/common';
import { PublicHeader } from '../../../components/client/PublicHeader';
import {
  AccordionStep,
  ClientDataOverlay,
  BarberSelectionStep,
  ServiceSelectionStep,
  DateTimeStep,
} from '../../../components/client/booking';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchPublicBarbers,
  setServices,
  setSelectedBarber,
  setSelectedService,
  setSelectedDate,
  setSelectedTime,
  setPaymentMethod,
  setClientData,
  setCurrentStep,
  submitAppointment,
  resetBooking,
} from '../../../store/slices/bookingSlice';
import { useGetServicesQuery } from '../../../services/service.api';
import { useGetMyMembershipQuery } from '../../../services/membershipApi';
import { authApi } from '../../../services/authApi';
import { getAccessToken } from '../../../services/api';
import { formatDate } from '../../../utils/formatDate';
import type { BookingStep, BarberPublic, PaymentMethod } from '../../../types/booking';

const getTodayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const areStepsComplete = (
  barber: unknown,
  service: unknown,
  date: unknown,
  time: unknown,
): boolean => Boolean(barber) && Boolean(service) && Boolean(date) && Boolean(time);

export const BookingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const {
    async: {
      barbers,
      services,
      availableSlots,
      isLoadingBarbers,
      isLoadingServices,
      isLoadingSlots,
      isConfirming,
      barbersError,
      servicesError,
      confirmError,
      submitSuccess,
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
      paymentMethod,
    },
  } = useAppSelector((state) => state.booking);

  const { data: myMembership } = useGetMyMembershipQuery(undefined, {
    skip: !authUser,
  });
  const activeMembership = myMembership?.active ?? null;
  const hasActiveMembership = activeMembership
    ? activeMembership.status === 'active' && new Date(activeMembership.endDate) > new Date()
    : false;
  const remainingCoupons = activeMembership
    ? Math.max(0, activeMembership.couponsTotal - activeMembership.couponsUsed)
    : 0;

  const [anyBarber, setAnyBarber] = React.useState(false);
  const [showClientForm, setShowClientForm] = React.useState(false);

  useEffect(() => {
    dispatch(fetchPublicBarbers());
    return () => {
      dispatch(resetBooking());
    };
  }, [dispatch]);

  const { data: rtkServices } = useGetServicesQuery();
  useEffect(() => {
    if (rtkServices) {
      dispatch(setServices(rtkServices));
    }
  }, [rtkServices, dispatch]);

  useEffect(() => {
    if (authUser) {
      if (!clientName && !clientLastname && !clientPhone && !clientEmail) {
        dispatch(setClientData({
          name: authUser.name || '',
          lastname: authUser.lastname || '',
          phone: authUser.phone || '',
          email: authUser.email || '',
        }));
      }
    }
  }, [authUser, clientName, clientLastname, clientPhone, clientEmail, dispatch]);

  useEffect(() => {
    if (!authUser && getAccessToken()) {
      dispatch(authApi.endpoints.getProfile.initiate());
    }
  }, [authUser, dispatch]);

  useEffect(() => {
    if (currentStep === 'datetime' && !selectedDate && selectedBarber) {
      dispatch(setSelectedDate(getTodayString()));
    }
  }, [currentStep, selectedDate, selectedBarber, dispatch]);

  useEffect(() => {
    if (areStepsComplete(selectedBarber, selectedService, selectedDate, selectedTime)) {
      setShowClientForm(true);
    }
     
  }, [selectedBarber, selectedService, selectedDate, selectedTime]);

  const handleStepToggle = useCallback(
    (step: BookingStep) => {
      if (showClientForm) {
        setShowClientForm(false);
        return;
      }
      if (step === 'service' && !selectedBarber) return;
      if (step === 'datetime' && !selectedService) return;
      if (step === currentStep) return;
      dispatch(setCurrentStep(step));
    },
    [selectedBarber, selectedService, currentStep, showClientForm, dispatch]
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

  const handlePaymentMethodChange = useCallback(
    (method: PaymentMethod) => {
      dispatch(setPaymentMethod(method));
    },
    [dispatch]
  );

  const handleSubmit = useCallback(() => {
    dispatch(submitAppointment());
  }, [dispatch]);

  const navigate = useNavigate();

  useEffect(() => {
    if (submitSuccess) {
      navigate('/mis-turnos');
    }
  }, [submitSuccess, navigate]);

  const isStep3Complete = !!selectedDate && !!selectedTime;

  const barberSummary = anyBarber
    ? 'Cualquier barbero'
    : selectedBarber
      ? `${selectedBarber.name} ${selectedBarber.lastname}`
      : null;

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <PublicHeader />

      <div className="relative mx-auto max-w-2xl px-6 pb-32 pt-8 sm:px-8 sm:pt-10">
          <AnimatedContainer animation="fadeInDown" className="text-center mb-8">
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
              isExpanded={currentStep === 'barber'}
              isCompleted={!!selectedBarber}
              isLocked={false}
              onToggle={() => handleStepToggle('barber')}
            >
              <BarberSelectionStep
                barbers={barbers}
                selectedBarber={selectedBarber}
                isLoading={isLoadingBarbers}
                error={barbersError}
                onSelect={handleBarberSelect}
                onSelectAny={handleAnyBarberSelect}
                anyBarber={anyBarber}
              />
            </AccordionStep>

            <AccordionStep
              stepNumber={2}
              title="Servicio"
              summary={selectedService ? `${selectedService.name} · $${selectedService.price}` : null}
              isExpanded={currentStep === 'service'}
              isCompleted={!!selectedService}
              isLocked={!selectedBarber}
              onToggle={() => handleStepToggle('service')}
            >
              <ServiceSelectionStep
                services={services}
                selectedService={selectedService}
                isLoading={isLoadingServices}
                error={servicesError}
                onSelect={(svc) => dispatch(setSelectedService(svc))}
              />
            </AccordionStep>

            <AccordionStep
              stepNumber={3}
              title="Fecha y hora"
              summary={
                selectedDate
                  ? `${formatDate(selectedDate)}${selectedTime ? ` - ${selectedTime}` : ''}`
                  : null
              }
              isExpanded={currentStep === 'datetime'}
              isCompleted={isStep3Complete}
              isLocked={!selectedService}
              onToggle={() => handleStepToggle('datetime')}
            >
              {selectedBarber && (
                <DateTimeStep
                  barberId={selectedBarber.id}
                  maxAdvanceDays={selectedBarber.maxAdvanceDays}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  availableSlots={availableSlots}
                  isLoadingSlots={isLoadingSlots}
                  onSelectDate={(date) => dispatch(setSelectedDate(date))}
                  onSelectTime={(time) => dispatch(setSelectedTime(time))}
                />
              )}
            </AccordionStep>
          </div>
      </div>

      <ClientDataOverlay
        isOpen={showClientForm}
        barber={selectedBarber}
        service={selectedService}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        clientName={clientName}
        clientLastname={clientLastname}
        clientPhone={clientPhone}
        clientEmail={clientEmail}
        paymentMethod={paymentMethod}
        hasActiveMembership={hasActiveMembership}
        remainingCoupons={remainingCoupons}
        isConfirming={isConfirming}
        confirmError={confirmError}
        isLoggedIn={!!authUser}
        onChange={(data) => dispatch(setClientData(data))}
        onPaymentMethodChange={handlePaymentMethodChange}
        onSubmit={handleSubmit}
        onClose={() => setShowClientForm(false)}
      />

      <AppFooter />
    </div>
  );
};

export default BookingPage;
