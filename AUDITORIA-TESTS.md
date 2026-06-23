# Auditoría de Tests — Calidad, Fragilidad y Boilerplate

> **Fecha:** 2026-06-16
> **Alcance:** 89 archivos de test (49 backend + 40 frontend), ~600 tests

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Tests totales analizados | ~600 |
| Tests con `toHaveBeenCalled()` sin argumentos | **32** |
| Tests que prueban comportamiento de Joi (utilidad debatible) | 109 |
| Mocks muertos (métodos sin uso) | ~40+ |
| Tests rotos o frágiles | **5** |
| Patrones de boilerplate duplicados | **10+** |
| Tests solo de render (sin interacción) | ~12 |

---

## 1. `toHaveBeenCalled()` / `toBeCalled()` SIN verificar argumentos

### 1.1 Backend — Middlewares

#### `validation.middleware.test.ts`

| Línea | Código | Tipo |
|:-----:|--------|:----:|
| 24 | `expect(next).toHaveBeenCalled()` | Débil — debe verificar `toHaveBeenCalledWith()` |
| 56 | `expect(next).toHaveBeenCalled()` | Débil |
| 69 | `expect(next).toHaveBeenCalled()` | Débil |
| 89 | `expect(next).toHaveBeenCalled()` | Débil |
| 111 | `expect(next).toHaveBeenCalled()` | Débil |
| 152 | `expect(next).toHaveBeenCalled()` | Débil |
| 34,44,77,97,123 | `expect(next).not.toHaveBeenCalled()` | ✅ Razonable (negativo) |

#### `auth.middleware.test.ts`

| Línea | Código | Tipo |
|:-----:|--------|:----:|
| 69 | `expect(next).toHaveBeenCalled()` | Débil |
| 102 | `expect(next).toHaveBeenCalled()` | Débil |
| 108 | `expect(next).toHaveBeenCalled()` | Débil |
| 143 | `expect(next).toHaveBeenCalled()` | Débil |
| 150 | `expect(next).toHaveBeenCalled()` | Débil |
| 157 | `expect(next).toHaveBeenCalled()` | Débil |
| 185 | `expect(next).toHaveBeenCalled()` | Débil |
| 192 | `expect(next).toHaveBeenCalled()` | Débil |
| 201 | `expect(next).toHaveBeenCalled()` | Débil |
| 209 | `expect(next).toHaveBeenCalled()` | Débil |
| 35,43,51,60,88,96,127,136 | `expect(next).not.toHaveBeenCalled()` | ✅ Razonable |

### 1.2 Backend — Use Cases

#### `create-appointment.usecase.test.ts`

| Línea | Código | Problema |
|:-----:|--------|----------|
| 249 | `expect(appointmentRepository.create).toHaveBeenCalled()` | No verifica qué cita se creó |
| 272 | `expect(appointmentRepository.create).toHaveBeenCalled()` | No verifica qué cita se creó |
| 344 | `expect(appointmentRepository.create).toHaveBeenCalled()` | No verifica qué cita se creó |

#### `register-user.usecase.test.ts`

| Línea | Código | Problema |
|:-----:|--------|----------|
| 124 | `expect(userRepository.createRegisteredClient).toHaveBeenCalled()` | No verifica qué usuario se registró |

#### `two-factor.usecase.test.ts`

| Línea | Código | Problema |
|:-----:|--------|----------|
| 170 | `expect(userRepository.updateTwoFactor).toHaveBeenCalled()` | Débil |
| 171 | `expect(emailService.sendMail).toHaveBeenCalled()` | Débil |
| 230 | `expect(userRepository.updateTwoFactor).toHaveBeenCalled()` | Débil |
| 268 | `expect(userRepository.updateTwoFactor).toHaveBeenCalled()` | Débil |
| 269 | `expect(userRepository.updateLastLogin).toHaveBeenCalled()` | Débil |
| 270 | `expect(refreshTokenRepository.create).toHaveBeenCalled()` | ✅ Este sí verifica con `With` |

#### `password-reset.usecase.test.ts`

| Línea | Código | Problema |
|:-----:|--------|----------|
| 121 | `expect(passwordResetRepository.create).toHaveBeenCalled()` | Débil |
| 121 | `expect(emailService.sendMail).toHaveBeenCalled()` | Débil |

#### `google-auth.usecase.test.ts`

| Línea | Código | Problema |
|:-----:|--------|----------|
| 179 | `expect(userRepository.updateLastLogin).toHaveBeenCalled()` | Débil |

#### `get-all-services.usecase.test.ts`

| Línea | Código | Problema |
|:-----:|--------|----------|
| 40 | `expect(serviceRepository.findAll).toHaveBeenCalled()` | Débil |

### 1.3 Frontend

| Archivo | Línea | Código | Problema |
|---------|:-----:|--------|----------|
| `BookingCalendar.test.tsx` | 48 | `expect(onPrevMonth).toHaveBeenCalled()` | No verifica argumentos |
| `BookingCalendar.test.tsx` | 61 | `expect(onSelectDate).toHaveBeenCalled()` | No verifica fecha seleccionada |
| `ClientDataOverlay.test.tsx` | 63 | `expect(onChange).toHaveBeenCalled()` | No verifica datos escritos |

---

## 2. Tests Rotos o Frágiles

### 2.1 🔴 `barber.routes.test.ts:182-187` — Bug real

```typescript
// El mock usa un objeto plano { message, statusCode } en vez de new AppError()
// El controller trata los errores que NO son AppError como "desconocidos" → status 500
// Pero la operación debería devolver 404
getByIdUseCase.execute.mockRejectedValue({
  message: 'Barbero no encontrado',
  statusCode: 404
});
// ...
expect(res.status).toBe(500);
```

**Problema:** El test pasa, pero esconde que el mock está mal construido. Si alguien cambia el controller para que sí lea `statusCode` del error, este test fallaría. Y viceversa: si el controller real devolviera 404, el test fallaría incorrectamente.

**Solución:** Usar `new AppError('Barbero no encontrado', 404)` en el mock.

### 2.2 🟡 `auth.routes.test.ts` — Integración frágil

| Problema | Detalle |
|----------|---------|
| Sin cleanup | No hay `afterEach` que limpie la DB. Segunda ejecución falla por emails duplicados. |
| Assertions débiles | Solo verifica `response.status === 200` y `response.body.message` truthy |
| No valida DB | No verifica que el usuario realmente se haya creado en MongoDB |
| Dependencia externa | Requiere MongoDB real, usa `describeIfMongo` que silencia fallos |

**Solución:** Agregar `afterEach(async () => { /* limpiar colecciones */ })` y verificar estado en DB.

### 2.3 🟡 `tempLock.routes.test.ts:106-113` — Rate limit flaky

```typescript
const requests = Array.from({ length: 21 }).map(() =>
  request(app).post('/').send(validPayload)
);
const responses = await Promise.all(requests);
expect(responses.filter(r => r.status === 429).length).toBeGreaterThan(0);
```

**Problema:** `Promise.all` dispara requests en paralelo. Dependiendo del entorno y la implementación del rate limiter, puede que las 21 lleguen antes de que el contador se incremente, resultando en 0 respuestas 429.

**Solución:** Usar requests secuenciales o aumentar el margen.

### 2.4 🟡 `BookingCalendar.test.tsx:55-62` — Selector frágil

```typescript
const dayButtons = container.querySelectorAll('button');
const realDayButton = Array.from(dayButtons).find(
  btn => !isNaN(Number(btn.textContent))
);
```

**Problema:** Si hay otros botones con texto numérico en el componente, selecciona el equivocado. `querySelectorAll('button')` es demasiado amplio.

**Solución:** Usar `getByRole('button', { name: /15/ })` o similar de Testing Library.

### 2.5 🟡 `StepIndicator.test.tsx:38-45` — Test potencialmente vacuo

```typescript
const barberButton = screen.queryByText('Barbero');
if (barberButton) {
  await user.click(barberButton);
}
// PASA IGUAL si barberButton es null (nunca se encontró)
expect(onStepClick).toHaveBeenCalled();
```

**Problema:** Si `screen.queryByText('Barbero')` no encuentra el elemento, el `if` impide el click y el test espera que `onStepClick` haya sido llamado. Pero `onStepClick` es `jest.fn()` que nunca se llamó → el test **fallaría**. Sin embargo, el patrón `if` es peligroso porque puede tragar errores silenciosamente en otros contextos.

**Solución:** Usar `getByText('Barbero')` (sin `query`) para que lance error si no existe, o mantener `queryByText` pero mover el `expect` dentro del `if`.

---

## 3. Assertions Débiles

### 3.1 `toBeTruthy()` en mensajes — vacuo

```typescript
// two-factor.usecase.test.ts:172
expect(result.message).toBeTruthy();

// password-reset.usecase.test.ts:171
expect(result.message).toBeTruthy();
```

Cualquier string no-vacío pasa. Debería verificar el contenido exacto del mensaje.

### 3.2 `toBeDefined()` / `not.toBeNull()` sin verificar propiedades

| Archivo | Línea | Código |
|---------|:-----:|--------|
| `create-appointment.usecase.test.ts` | 251 | `expect(result.appointment).toBeDefined()` |
| `mongo-templock.repository.test.ts` | 26 | `expect(id).toBeDefined()` |
| `mongo-templock.repository.test.ts` | 28 | `expect(doc).not.toBeNull()` |
| `mongo-templock.repository.test.ts` | 47 | `expect(found).not.toBeNull()` |
| `mongo-barber.repository.test.ts` | 65 | `expect(found).not.toBeNull()` |
| `mongo-barber.repository.test.ts` | 102 | `expect(updated).not.toBeNull()` |
| `mongo-barber.repository.test.ts` | 148 | `expect(updated).not.toBeNull()` |
| `auth.routes.test.ts` | 136 | `expect(updated?.password).not.toBeNull()` |

---

## 4. Boilerplate y Duplicación

### 4.1 🔴 `IUserRepository` mock duplicado en **6 archivos**

```typescript
userRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByPhone: jest.fn(),
  createRegisteredClient: jest.fn(),
  updatePassword: jest.fn(),
  updateTwoFactor: jest.fn(),
  updateLastLogin: jest.fn(),
  updateUserSecurity: jest.fn(),
};
```

| Archivo | Líneas | Métodos usados realmente | Tasa de uso |
|---------|:------:|:------------------------:|:-----------:|
| `get-current-user.usecase.test.ts` | 24-33 | 1/8 (`findById`) | **12%** |
| `register-user.usecase.test.ts` | 30-39 | 3/8 | 37% |
| `password-reset.usecase.test.ts` | 39-48 | 2/8 | 25% |
| `google-auth.usecase.test.ts` | 40-49 | 3/8 | 37% |
| `two-factor.usecase.test.ts` | 46-55 | 3/8 | 37% |
| `create-appointment.usecase.test.ts` | 136-140 | 4/8 | 50% |

**Costo:** ~48 líneas de boilerplate que podrían ser 6 llamadas a `makeMockUserRepository()`.

### 4.2 🟡 `ITempLockRepository` mock duplicado en **3 archivos**

```typescript
tempLockRepository = {
  create: jest.fn(),
  deleteMany: jest.fn(),
  deleteOne: jest.fn(),
  deleteById: jest.fn(),
  findByBarberAndDate: jest.fn(),
  findById: jest.fn(),
};
```

| Archivo | Líneas |
|---------|:------:|
| `create-templock.usecase.test.ts` | 16-23 |
| `release-templock.usecase.test.ts` | 9-16 |
| `create-appointment.usecase.test.ts` | 142-149 |

### 4.3 🟡 `IAppointmentRepository` mock duplicado en **5 archivos**

11 métodos mockeados en cada uno:
- `get-appointment-by-id.usecase.test.ts` (usa 1/11)
- `cancel-appointment.usecase.test.ts` (usa 3/11)
- `update-appointment-status.usecase.test.ts` (usa 2/11)
- `get-appointments-anonymous.usecase.test.ts`
- `create-appointment.usecase.test.ts`

### 4.4 🟡 `ITokenService` mock duplicado en **3 archivos**

```typescript
tokenService = {
  sign: jest.fn(),
  verify: jest.fn(),
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  signPartialToken: jest.fn(),
  verifyPartialToken: jest.fn(),
};
```

### 4.5 🟢 Controller `{ execute: jest.fn() }` en **9 archivos**

```typescript
useCase = { execute: jest.fn() } as unknown as jest.Mocked<UseCaseType>;
```

Aparece en: `auth.controller.test.ts`, `auth-google.controller.test.ts`, `two-factor.controller.test.ts`, `password-recovery.controller.test.ts`, `service.controller.test.ts`, `user.controller.test.ts`, `templock.controller.test.ts`, `appointment.controller.test.ts`, `barber.controller.test.ts`.

### 4.6 🟢 `createScheduleDay()` / `createSchedule()` factories en **3 archivos**

```typescript
const createEmptyDay = () => ({ startTime: null, endTime: null, breaks: [] });
const createSchedule = () => ({
  monday: createEmptyDay(), tuesday: createEmptyDay(), /* ... */
});
```

### 4.7 🟢 Frontend `apiMock` pattern en **3 archivos**

```typescript
const apiMock = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/api', () => ({
  default: apiMock,
  setupDispatch: vi.fn(),
}));
```

### Recomendación

Extraer a `backend-barber/tests/test-utils/mocks.ts`:

```typescript
export const makeMockUserRepository = () => ({
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByPhone: jest.fn(),
  createRegisteredClient: jest.fn(),
  updatePassword: jest.fn(),
  updateTwoFactor: jest.fn(),
  updateLastLogin: jest.fn(),
  updateUserSecurity: jest.fn(),
});

export const makeMockTempLockRepository = () => ({
  create: jest.fn(),
  deleteMany: jest.fn(),
  deleteOne: jest.fn(),
  deleteById: jest.fn(),
  findByBarberAndDate: jest.fn(),
  findById: jest.fn(),
});
// ... etc
```

---

## 5. Tests de Utilidad Debatible

### 5.1 Validators Joi (109 tests)

`auth.validator.test.ts` (52), `barber.validator.test.ts` (35), `recovery.validator.test.ts` (14), `appointment.validator.test.ts` (8).

**A favor:** Verifican que la configuración de schemas sea correcta. Si alguien borra un `.required()` o cambia un pattern, el test lo detecta.

**En contra:** Esencialmente testean que Joi funciona como dice la documentación. Un test de integración (ruta → validator → response 400) probaría lo mismo con mayor fidelidad.

**Veredicto:** Mantener pero no expandir. Son frágiles ante cambios de schema pero baratos de mantener.

### 5.2 `service.routes.test.ts` (1 test, 25 líneas)

Un solo test que verifica `GET /api/services` devuelve 4 servicios con la forma correcta. Depende de datos estáticos seedeados.

**Veredicto:** Smoke test útil, pero engañoso si alguien cambia los datos semilla.

### 5.3 Tests de solo render (frontend, ~12 tests)

Componentes como `AnimatedContainer`, `LoadingSkeleton`, `PasswordStrength` tienen tests que solo verifican que renderizan con ciertas props.

**Veredicto:** Valor marginal si ya hay tests de integración que cubren estos componentes. Útiles como documentación viva de la API del componente.

---

## 6. Mocks Muertos (métodos mockeados pero nunca referenciados)

### Backend

| Archivo | Métodos muertos |
|---------|-----------------|
| `get-current-user.usecase.test.ts` | 7/8 métodos de `IUserRepository` |
| `register-user.usecase.test.ts` | 5/8 métodos de `IUserRepository` |
| `password-reset.usecase.test.ts` | 6/8 métodos de `IUserRepository`; `appointmentRepository` completo |
| `google-auth.usecase.test.ts` | 5/8 métodos de `IUserRepository`; `passwordHasher` completo |
| `two-factor.usecase.test.ts` | 5/8 métodos de `IUserRepository` |
| `get-appointment-by-id.usecase.test.ts` | 10/11 métodos de `IAppointmentRepository` |
| `cancel-appointment.usecase.test.ts` | 8/11 métodos de `IAppointmentRepository` |
| `update-appointment-status.usecase.test.ts` | 9/11 métodos de `IAppointmentRepository` |

### Frontend

| Archivo | Problema |
|---------|----------|
| `AdminProfilePage.test.tsx` | `professionalService` mockeado pero nunca usado (datos vienen de Redux) |
| `auth-google.controller.test.ts` | `completeGoogleProfileUseCase` mockeado pero `completeProfile` nunca testeado |

---

## 7. Tests Faltantes (Brechas Detectadas)

| Área | Falta |
|------|-------|
| Auth forms frontend | **Loading state** en LoginPage, RegisterForm, RequestResetForm, ResetPasswordForm |
| Admin pages | **Submissión** de formularios, calls a API, success/error feedback |
| `completeGoogleProfile` controller | Método completo sin testear |
| `BookingCalendar` | Navegación al **próximo** mes, fechas pasadas deshabilitadas, constraint `maxAdvanceDays` |
| `Price` value object | Tests para negativo, float, null, undefined, valores grandes |
| `DurationMinutes` value object | Tests para 0, no-entero, valores grandes |
| `get-available-slots` use case | Integración con `tempLockRepository` siempre mockeada como `[]` — nunca se prueba el filtrado de tempLocks reales |

---

## Prioridades de Acción

| Prioridad | Acción | Archivos afectados | Impacto |
|:---------:|--------|:------------------:|:-------:|
| 🔴 | Arreglar mock de error en `barber.routes.test.ts` (objeto plano vs AppError) | 1 | Bug real |
| 🔴 | Extraer factories de mocks compartidos | ~15 archivos | Elimina ~120 líneas boilerplate |
| 🟡 | Reforzar 32 `toHaveBeenCalled()` → `toHaveBeenCalledWith()` | ~15 archivos | Assertions más precisos |
| 🟡 | Agregar `afterEach` cleanup a `auth.routes.test.ts` | 1 | Elimina fragilidad |
| 🟡 | Arreglar test vacuo de `StepIndicator` (mover assert dentro del `if`) | 1 | Elimina falso positivo potencial |
| 🟢 | Agregar loading state tests en formularios de auth | 4 | Cobertura de UX faltante |
| 🟢 | Reemplazar `toBeTruthy()` en mensajes por `toBe('mensaje exacto')` | 2 | Assertions más estrictos |
