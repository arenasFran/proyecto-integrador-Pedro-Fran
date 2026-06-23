# Tests Pendientes — Prioridad Crítica y Alta

---

## BACKEND

### 🔴 Críticos — Sin cobertura alguna

#### TempLock (commit `9d75505`)
- `src/application/use-cases/tempLock/CreateTempLockUseCase.ts`
- `src/application/use-cases/tempLock/ReleaseTempLockUseCase.ts`
- `src/interface-adapters/controllers/tempLock/TempLockController.ts`
- `src/interface-adapters/routes/tempLock.routes.ts`
- `src/infrastructure/repositories/mongodb/MongoTempLockRepository.ts`
- `src/wiring/tempLock.ts`

#### User /me (commit `a843ecd`)
- `src/application/use-cases/user/GetCurrentUserUseCase.ts`
- `src/interface-adapters/controllers/user/UserController.ts`
- `src/interface-adapters/routes/user.routes.ts`
- `src/wiring/user.ts`

---

### 🟡 Alta

#### Rutas — Tests de integración faltantes
- `src/interface-adapters/routes/appointment.routes.ts`
- `src/interface-adapters/routes/tempLock.routes.ts`
- `src/interface-adapters/routes/user.routes.ts`

#### Validators
- `src/interface-adapters/validators/auth.validator.ts`
- `src/interface-adapters/validators/barber.validator.ts`
- `src/interface-adapters/validators/recovery.validator.ts`

#### Middlewares
- `src/interface-adapters/middlewares/auth.middleware.ts`
- `src/interface-adapters/middlewares/validation.middleware.ts`

---

## FRONTEND

### 🔴 Crítico — Booking Flow (0 tests)

#### Componentes (14)
- `src/components/client/booking/AccordionStep.tsx`
- `src/components/client/booking/BarberCard.tsx`
- `src/components/client/booking/BarberSelectionStep.tsx`
- `src/components/client/booking/BookingCalendar.tsx`
- `src/components/client/booking/BookingConfirmationModal.tsx`
- `src/components/client/booking/BookingSuccessModal.tsx`
- `src/components/client/booking/ClientDataOverlay.tsx`
- `src/components/client/booking/DateTimeStep.tsx`
- `src/components/client/booking/ServiceCard.tsx`
- `src/components/client/booking/ServiceSelectionStep.tsx`
- `src/components/client/booking/StepIndicator.tsx`
- `src/components/client/booking/StickyBookingFooter.tsx`
- `src/components/client/booking/TimeSlotGrid.tsx`
- `src/components/client/common/LoadingSkeleton.tsx`

#### Página
- `src/pages/client/BookingPage/index.tsx`

#### Store slice
- `src/store/slices/bookingSlice.ts`

---

### 🟡 Alta

#### Servicios sin test unitario
- `src/services/appointment.service.ts`
- `src/services/appointmentApi.ts`
- `src/services/authApi.ts`
- `src/services/service.service.ts`

#### Store slice sin test
- `src/store/slices/bookingSlice.ts` (ya listado arriba como parte del booking flow)
