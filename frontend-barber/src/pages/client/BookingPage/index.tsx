import React, { useCallback, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FiCalendar, FiCheckCircle, FiScissors, FiUser } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { PublicHeader } from '../../../components/client/PublicHeader';
import { AccordionStep, BarberSelectionStep, ClientDataOverlay, DateTimeStep, ServiceSelectionStep } from '../../../components/client/booking';
import { StepIndicator as BookingProgress } from '../../../components/client/booking/StepIndicator';
import { AppFooter } from '../../../components/common';
import PaymentModal from '../../../components/payment/PaymentModal';
import { getAccessToken } from '../../../services/api';
import { useGetMyMembershipQuery } from '../../../services/membershipApi';
import { useGetServicesQuery } from '../../../services/service.api';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchPublicBarbers, resetBooking, resetBookingFlow, restoreBookingFlow, setClientData, setCurrentStep, setPaymentMethod, setSelectedBarber, setSelectedDate, setSelectedService, setSelectedTime, setServices, submitAppointment } from '../../../store/slices/bookingSlice';
import type { BarberPublic, BookingStep, PaymentMethod } from '../../../types/booking';
import { formatDate } from '../../../utils/formatDate';
import { getTokenUser } from '../../../utils/token';

const getTodayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const areStepsComplete = (barber: unknown, service: unknown, date: unknown, time: unknown): boolean => Boolean(barber) && Boolean(service) && Boolean(date) && Boolean(time);

const BOOKING_DRAFT_STORAGE_PREFIX = 'barber-booking-draft:v2';
const LEGACY_BOOKING_DRAFT_STORAGE_KEY = 'barber-booking-draft';
const BOOKING_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type PersistedBookingDraft = {
  flow: {
    currentStep: BookingStep;
    selectedBarberId: string | null;
    selectedServiceId: string | null;
    selectedDate: string | null;
    selectedTime: string | null;
    paymentMethod: PaymentMethod;
  };
  showClientForm: boolean;
  savedAt: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object';

const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';

const isBookingStep = (value: unknown): value is BookingStep => value === 'barber' || value === 'service' || value === 'datetime';

const isPaymentMethod = (value: unknown): value is PaymentMethod => value === 'local' || value === 'online' || value === 'memberPass';

const getBookingDraftStorageKey = (): string => {
  const tokenUser = getTokenUser(getAccessToken());
  return `${BOOKING_DRAFT_STORAGE_PREFIX}:${tokenUser?.id ?? 'guest'}`;
};

const readBookingDraft = (storageKey: string): PersistedBookingDraft | null => {
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isRecord(parsed) || !isRecord(parsed.flow)) return null;

    const flow = parsed.flow;
    if (
      !isBookingStep(flow.currentStep) ||
      !isNullableString(flow.selectedBarberId) ||
      !isNullableString(flow.selectedServiceId) ||
      !isNullableString(flow.selectedDate) ||
      !isNullableString(flow.selectedTime) ||
      !isPaymentMethod(flow.paymentMethod) ||
      typeof parsed.showClientForm !== 'boolean' ||
      typeof parsed.savedAt !== 'number' ||
      Date.now() - parsed.savedAt > BOOKING_DRAFT_TTL_MS
    ) return null;

    return {
      flow: {
        currentStep: flow.currentStep,
        selectedBarberId: flow.selectedBarberId,
        selectedServiceId: flow.selectedServiceId,
        selectedDate: flow.selectedDate,
        selectedTime: flow.selectedTime,
        paymentMethod: flow.paymentMethod,
      },
      showClientForm: parsed.showClientForm,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
};

const isDateInBarberWindow = (date: string, maxAdvanceDays: number): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const today = new Date(`${getTodayString()}T12:00:00`);
  const selected = new Date(`${date}T12:00:00`);
  if (Number.isNaN(selected.getTime())) return false;
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
  return selected >= today && selected <= maxDate;
};

export const BookingPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const authUser = useAppSelector((state) => state.auth.user);
  const { async: { barbers, services, availableSlots, slotsReason, isLoadingBarbers, isLoadingServices, isLoadingSlots, isConfirming, barbersError, servicesError, slotsError, confirmError, emailRegisteredError, submitSuccess, preferenceId }, flow: { currentStep, selectedBarber, selectedService, selectedDate, selectedTime, clientName, clientLastname, clientPhone, clientEmail, paymentMethod } } = useAppSelector((state) => state.booking);

  const { data: myMembership } = useGetMyMembershipQuery(undefined, { skip: !authUser });
  const activeMembership = myMembership?.active ?? null;
  const hasActiveMembership = activeMembership ? activeMembership.status === 'active' && new Date(activeMembership.endDate) > new Date() : false;
  const remainingCoupons = activeMembership ? Math.max(0, activeMembership.couponsTotal - activeMembership.couponsUsed) : 0;
  const allStepsComplete = areStepsComplete(selectedBarber, selectedService, selectedDate, selectedTime);
  const bookingDraftStorageKey = getBookingDraftStorageKey();
  const [initialDraft] = React.useState<PersistedBookingDraft | null>(() => {
    try {
      sessionStorage.removeItem(LEGACY_BOOKING_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage failures in restricted browsers.
    }
    return readBookingDraft(bookingDraftStorageKey);
  });
  const [showClientForm, setShowClientForm] = React.useState(!initialDraft && allStepsComplete);
  const skipDraftPersistence = React.useRef(true);
  const draftIdentityRef = React.useRef(bookingDraftStorageKey);

  const { data: rtkServices, refetch: refetchServices, isLoading: isLoadingServicesQuery } = useGetServicesQuery();

  useEffect(() => {
    if (draftIdentityRef.current === bookingDraftStorageKey) return;
    draftIdentityRef.current = bookingDraftStorageKey;
    dispatch(resetBookingFlow());
    setShowClientForm(false);
  }, [bookingDraftStorageKey, dispatch]);

  useEffect(() => {
    if (!initialDraft || isLoadingBarbers || isLoadingServicesQuery || !rtkServices) return;

    const draft = initialDraft.flow;
    const barber = draft.selectedBarberId ? barbers.find((item) => item.id === draft.selectedBarberId && item.isActive) : null;
    const service = draft.selectedServiceId ? rtkServices.find((item) => item.id === draft.selectedServiceId && item.status === 'active') : null;
    const hasValidSelection = Boolean(barber && service);
    const hasValidDate = !draft.selectedDate || (barber ? isDateInBarberWindow(draft.selectedDate, barber.maxAdvanceDays) : false);

    if (!hasValidSelection || !hasValidDate) {
      dispatch(resetBookingFlow());
      try {
        sessionStorage.removeItem(bookingDraftStorageKey);
      } catch {
        // Ignore storage failures so booking remains usable.
      }
      return;
    }

    dispatch(restoreBookingFlow({
      currentStep: draft.currentStep,
      selectedBarber: barber,
      selectedService: service,
      selectedDate: draft.selectedDate,
      // A stored time must be revalidated against fresh availability.
      selectedTime: null,
      paymentMethod: draft.paymentMethod === 'memberPass' ? 'local' : draft.paymentMethod,
    }));
  }, [barbers, bookingDraftStorageKey, dispatch, initialDraft, isLoadingBarbers, isLoadingServicesQuery, rtkServices]);

  useEffect(() => {
    dispatch(fetchPublicBarbers());
    return () => {
      // Do not retain contact data in the global store after leaving booking.
      dispatch(resetBookingFlow());
    };
  }, [dispatch]);

  useEffect(() => {
    if (skipDraftPersistence.current) {
      skipDraftPersistence.current = false;
      return;
    }
    try {
      sessionStorage.setItem(bookingDraftStorageKey, JSON.stringify({
        savedAt: Date.now(),
        showClientForm,
        flow: {
          currentStep,
          selectedBarberId: selectedBarber?.id ?? null,
          selectedServiceId: selectedService?.id ?? null,
          selectedDate,
          selectedTime,
          paymentMethod,
        },
      }));
    } catch {
      // Ignore storage failures so booking remains usable in restricted browsers.
    }
  }, [bookingDraftStorageKey, currentStep, paymentMethod, selectedBarber, selectedDate, selectedService, selectedTime, showClientForm]);

  useEffect(() => { if (rtkServices) dispatch(setServices(rtkServices)); }, [rtkServices, dispatch]);
  useEffect(() => {
    if (authUser && !clientName && !clientLastname && !clientPhone && !clientEmail) dispatch(setClientData({ name: authUser.name || '', lastname: authUser.lastname || '', phone: authUser.phone || '', email: authUser.email || '' }));
  }, [authUser, clientName, clientLastname, clientPhone, clientEmail, dispatch]);
  useEffect(() => {
    if (currentStep === 'datetime' && !selectedDate && selectedBarber) dispatch(setSelectedDate(getTodayString()));
  }, [currentStep, selectedDate, selectedBarber, dispatch]);
  useEffect(() => {
    if (!submitSuccess) return;
    try {
      sessionStorage.removeItem(bookingDraftStorageKey);
    } catch {
      // Ignore storage failures after a successful booking.
    }
    if (!preferenceId) {
      dispatch(resetBooking());
      navigate('/mis-turnos');
    }
  }, [bookingDraftStorageKey, dispatch, navigate, preferenceId, submitSuccess]);

  const handleStepToggle = useCallback((step: BookingStep) => {
    if (showClientForm) { setShowClientForm(false); return; }
    if (step === 'service' && !selectedBarber) return;
    if (step === 'datetime' && !selectedService) return;
    if (step !== currentStep) dispatch(setCurrentStep(step));
  }, [selectedBarber, selectedService, currentStep, showClientForm, dispatch]);
  const handleBarberSelect = useCallback((barber: BarberPublic) => dispatch(setSelectedBarber(barber)), [dispatch]);
  const handleTimeSelect = useCallback((time: string) => { dispatch(setSelectedTime(time)); setShowClientForm(true); }, [dispatch]);
  const handlePaymentMethodChange = useCallback((method: PaymentMethod) => dispatch(setPaymentMethod(method)), [dispatch]);
  const handleSubmit = useCallback(() => dispatch(submitAppointment()), [dispatch]);
  const handlePaymentClose = useCallback(() => {
    dispatch(resetBooking());
    navigate('/mis-turnos');
  }, [dispatch, navigate]);
  const isStep3Complete = Boolean(selectedDate && selectedTime);
  const barberSummary = selectedBarber ? `${selectedBarber.name} ${selectedBarber.lastname}` : null;
  const showPaymentModal = submitSuccess && Boolean(preferenceId);

  const activeStep = currentStep === 'barber' ? (
    <AccordionStep stepNumber={1} title="Tu barbero" summary={barberSummary} isExpanded isCompleted={Boolean(selectedBarber)} isLocked={false} onToggle={() => handleStepToggle('barber')}>
      <BarberSelectionStep barbers={barbers} selectedBarber={selectedBarber} isLoading={isLoadingBarbers} error={barbersError} onSelect={handleBarberSelect} onRetry={() => { void dispatch(fetchPublicBarbers()); }} />
    </AccordionStep>
  ) : currentStep === 'service' ? (
    <AccordionStep stepNumber={2} title="Servicio" summary={selectedService ? `${selectedService.name} · $${selectedService.price}` : null} isExpanded isCompleted={Boolean(selectedService)} isLocked={!selectedBarber} onToggle={() => handleStepToggle('service')}>
      <ServiceSelectionStep services={services} selectedService={selectedService} isLoading={isLoadingServices || isLoadingServicesQuery} error={servicesError} onSelect={(service) => dispatch(setSelectedService(service))} onRetry={refetchServices ? () => { void refetchServices(); } : undefined} />
    </AccordionStep>
  ) : (
    <AccordionStep stepNumber={3} title="Fecha y hora" summary={selectedDate ? `${formatDate(selectedDate)}${selectedTime ? ` - ${selectedTime}` : ''}` : null} isExpanded isCompleted={isStep3Complete} isLocked={!selectedService} onToggle={() => handleStepToggle('datetime')}>
      {selectedBarber && <DateTimeStep barberId={selectedBarber.id} maxAdvanceDays={selectedBarber.maxAdvanceDays} schedule={selectedBarber.schedule} selectedDate={selectedDate} selectedTime={selectedTime} availableSlots={availableSlots} slotsReason={slotsReason} slotsError={slotsError} isLoadingSlots={isLoadingSlots} onSelectDate={(date) => dispatch(setSelectedDate(date))} onSelectTime={handleTimeSelect} />}
    </AccordionStep>
  );

  const bookingSummary = (
    <aside className="sticky top-8 hidden h-fit lg:block">
      <div className="overflow-hidden rounded-[22px] border border-[#292929] bg-[#111111] shadow-[0_22px_60px_rgba(0,0,0,0.2)]">
        <div className="border-b border-[#292929] px-5 py-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF8A4C]">Tu reserva</p></div>
        <div className="space-y-1 p-3">
          <div className={`flex items-center gap-3 rounded-[14px] px-3 py-3 transition-colors ${selectedBarber ? 'bg-[#191919]' : 'bg-transparent'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${selectedBarber ? 'bg-[#FF5C00] text-white' : 'bg-[#242424] text-[#666666]'}`}>{selectedBarber ? <FiCheckCircle className="h-4 w-4" /> : <FiUser className="h-4 w-4" />}</span><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#666666]">Barbero</span><span className={`block truncate text-[13px] font-semibold ${selectedBarber ? 'text-white' : 'text-[#555555]'}`}>{barberSummary || 'Pendiente'}</span></span></div>
          <div className={`flex items-center gap-3 rounded-[14px] px-3 py-3 transition-colors ${selectedService ? 'bg-[#191919]' : 'bg-transparent'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${selectedService ? 'bg-[#FF5C00] text-white' : 'bg-[#242424] text-[#666666]'}`}>{selectedService ? <FiCheckCircle className="h-4 w-4" /> : <FiScissors className="h-4 w-4" />}</span><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#666666]">Servicio</span><span className={`block truncate text-[13px] font-semibold ${selectedService ? 'text-white' : 'text-[#555555]'}`}>{selectedService?.name || 'Pendiente'}</span></span>{selectedService && <span className="ml-auto text-[12px] font-bold text-[#FF8A4C]">${selectedService.price}</span>}</div>
          <div className={`flex items-center gap-3 rounded-[14px] px-3 py-3 transition-colors ${selectedDate ? 'bg-[#191919]' : 'bg-transparent'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${isStep3Complete ? 'bg-[#FF5C00] text-white' : 'bg-[#242424] text-[#666666]'}`}>{isStep3Complete ? <FiCheckCircle className="h-4 w-4" /> : <FiCalendar className="h-4 w-4" />}</span><span className="min-w-0"><span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#666666]">Fecha y hora</span><span className={`block truncate text-[13px] font-semibold ${selectedDate ? 'text-white' : 'text-[#555555]'}`}>{selectedDate ? `${formatDate(selectedDate)}${selectedTime ? ` · ${selectedTime}` : ''}` : 'Pendiente'}</span></span></div>
        </div>
      </div>
      <button
        type="button"
        disabled={!allStepsComplete}
        onClick={() => setShowClientForm(true)}
        className="mt-3 flex min-h-[46px] w-full items-center justify-center rounded-[12px] border border-[#FF5C00]/60 bg-transparent px-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[#FF8A4C] outline-none transition-all duration-200 hover:bg-[#FF5C00]/[0.08] focus-visible:ring-2 focus-visible:ring-[#FF5C00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080808] disabled:cursor-not-allowed disabled:border-[#292929] disabled:text-[#555555] disabled:hover:bg-transparent"
      >
        Confirmar
      </button>
    </aside>
  );

  const bookingContent = (
    <>
      <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }} className="relative min-h-screen overflow-hidden bg-[#080808] text-white">
        <div className="pointer-events-none absolute -left-32 top-[-180px] h-[460px] w-[460px] rounded-full bg-[#FF5C00]/[0.045] blur-[110px]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-8 sm:pt-12 lg:px-10 lg:pb-28">
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.38, ease: 'easeOut' }} className="mx-auto mb-6 w-full rounded-[18px] border border-[#242424] bg-[#0D0D0D] px-3 py-3 sm:px-6 sm:py-4"><BookingProgress currentStep={currentStep} completedSteps={[...(selectedBarber ? ['barber' as const] : []), ...(selectedService ? ['service' as const] : []), ...(isStep3Complete ? ['datetime' as const] : [])]} onStepClick={handleStepToggle} /></motion.div>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_310px] lg:gap-8">
            <main className="flex min-w-0 flex-col gap-3" aria-label="Pasos para reservar un turno">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={currentStep} className="min-w-0" initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -8 }} transition={{ duration: reduceMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}>
                  {activeStep}
                </motion.div>
              </AnimatePresence>
            </main>
            {bookingSummary}
          </div>
        </div>
      </motion.div>
      <ClientDataOverlay isOpen={showClientForm} barber={selectedBarber} service={selectedService} selectedDate={selectedDate} selectedTime={selectedTime} clientName={clientName} clientLastname={clientLastname} clientPhone={clientPhone} clientEmail={clientEmail} paymentMethod={paymentMethod} hasActiveMembership={hasActiveMembership} remainingCoupons={remainingCoupons} isConfirming={isConfirming} confirmError={confirmError} emailRegisteredError={emailRegisteredError} isLoggedIn={Boolean(authUser)} onChange={(data) => dispatch(setClientData(data))} onPaymentMethodChange={handlePaymentMethodChange} onSubmit={handleSubmit} onClose={() => setShowClientForm(false)} onGoToLogin={() => navigate('/login')} />
      <PaymentModal isOpen={showPaymentModal} preferenceId={preferenceId || ''} onClose={handlePaymentClose} title="Pagar turno" />
    </>
  );

  if (authUser) return bookingContent;
  return <div className="min-h-screen bg-[#080808] text-white"><PublicHeader />{bookingContent}<AppFooter /></div>;
};

export default BookingPage;
