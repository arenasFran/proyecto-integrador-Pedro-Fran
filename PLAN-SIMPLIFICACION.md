# Plan de Simplificación — Sistema de Gestión de Turnos (Backend)

> **Origen:** Auditorías AUDITORIA-SOBREINGENIERIA.md + AUDITORIA-TESTS.md
> **Objetivo:** Reducir ~131 archivos fuente backend a ~60 manteniendo la estructura de capas Clean Architecture
> **Estrategia:** Tests se actualizan al final (Fase 10). Cada fase es una iteración independiente de DeepSeek v4.

---

## Resumen de Fases

| Fase | Cambio | Archivos Eliminados | Archivos Modificados/Creados | Riesgo |
|:----:|--------|:-------------------:|:----------------------------:|:------:|
| 1 | response.ts + eliminar 4 Presenters | -4 | +1 creado, ~9 modificados | Bajo |
| 2 | Eliminar IDateTimeProvider + IRandomGenerator | -4 | ~11 modificados | Bajo |
| 3 | Eliminar Price + DurationMinutes VOs | -2 | ~3 modificados | Bajo |
| 4 | Eliminar 6 Mappers | -6 | ~8 modificados | Bajo-Medio |
| 5 | Fusionar Use Cases pasamanos en Controllers | -15 | ~9 modificados, 6 wiring modificados | Alto |
| 6 | Eliminar interfaces repositorio single-impl | -7 | ~13 modificados | Medio |
| 7 | Consolidar wiring (6 → 2 archivos) | -4 | ~2 modificados | Bajo-Medio |
| 8 | Simplificar entidad Appointment | 0 | 1 archivo pesado (~299→~100 líneas) | Medio |
| 9 | Consolidar DTOs redundantes | ~-10 | ~15 modificados | Bajo |
| 10 | Arreglar y consolidar tests | — | ~45 archivos de test + test-utils | Medio |
| | **Totales** | **~-68 archivos** | **~60 archivos backend resultantes** | |

---

## Fase 1: Common Infrastructure — response helper

**Objetivo:** Eliminar 4 presenters idénticos reemplazándolos por un solo helper.

**Fundamento:** Los 4 presenters (`AppointmentPresenter`, `AuthPresenter`, `BarberPresenter`, `ServicePresenter`) son copias exactas de 16 líneas cada uno. Solo varía el nombre de la clase. Crean dependencia innecesaria en cada controller.

### Cambios

**Archivos a crear (1):**
- `src/common/response.ts` — funciones `sendSuccess(res, data, status?)` y `sendError(res, error, fallbackMessage)`

**Archivos a eliminar (4):**
- `src/interface-adapters/presenters/AuthPresenter.ts`
- `src/interface-adapters/presenters/BarberPresenter.ts`
- `src/interface-adapters/presenters/AppointmentPresenter.ts`
- `src/interface-adapters/presenters/ServicePresenter.ts`

**Archivos a modificar (9 controllers):**
- `src/interface-adapters/controllers/appointment/AppointmentController.ts`
  - `AppointmentPresenter.success/handleError` → `sendSuccess/sendError`
- `src/interface-adapters/controllers/auth/AuthController.ts`
  - `AuthPresenter.success/handleError` → `sendSuccess/sendError`
- `src/interface-adapters/controllers/auth/AuthGoogleController.ts`
  - `AuthPresenter.success/handleError` → `sendSuccess/sendError`
- `src/interface-adapters/controllers/auth/TwoFactorController.ts`
  - `AuthPresenter.success/handleError` → `sendSuccess/sendError`
- `src/interface-adapters/controllers/auth/PasswordRecoveryController.ts`
  - `AuthPresenter.success/handleError` → `sendSuccess/sendError`
- `src/interface-adapters/controllers/barber/BarberController.ts`
  - `BarberPresenter.success/handleError` → `sendSuccess/sendError`
- `src/interface-adapters/controllers/service/ServiceController.ts`
  - `ServicePresenter.success/handleError` → `sendSuccess/sendError`
- `src/interface-adapters/controllers/tempLock/TempLockController.ts`
  - `BarberPresenter.success/handleError` → `sendSuccess/sendError`
- `src/interface-adapters/controllers/user/UserController.ts`
  - `AuthPresenter.success/handleError` → `sendSuccess/sendError`

### Criterio de éxito
- `npm run build` compila sin errores
- `npm run start` (o equivalente) arranca sin errores de importación
- Los 9 endpoints responden igual que antes (el helper es idéntico a los presenters)

---

## Fase 2: Eliminar Trivial Wrappers (IDateTimeProvider + IRandomGenerator)

**Objetivo:** Eliminar 2 interfaces y 2 implementaciones que envuelven APIs nativas de Node.js/JavaScript.

**Fundamento:**
- `IDateTimeProvider.now()` → `new Date()`. Jest ya permite mockear tiempo con `jest.useFakeTimers()`. No hay escenario donde se necesite otra implementación.
- `IRandomGenerator` → `crypto.randomInt()` y `crypto.randomBytes()`. Son nativos de Node.js, no hay sustituto real.

### Cambios

**Archivos a eliminar (4):**
- `src/application/ports/IDateTimeProvider.ts`
- `src/infrastructure/services/DateTimeProvider.ts`
- `src/application/ports/IRandomGenerator.ts`
- `src/infrastructure/services/RandomGenerator.ts`

**Archivos a modificar — use cases con IDateTimeProvider (7):**
Cada uno: eliminar import y parámetro del constructor, reemplazar `this.dateTimeProvider.now()` por `new Date()`.
- `src/application/use-cases/auth/SendTwoFactorCodeUseCase.ts`
- `src/application/use-cases/auth/VerifyTwoFactorUseCase.ts`
- `src/application/use-cases/auth/RefreshTokenUseCase.ts`
- `src/application/use-cases/auth/AuthenticateWithGoogleUseCase.ts`
- `src/application/use-cases/auth/CompleteGoogleProfileUseCase.ts`
- `src/application/use-cases/password/RequestPasswordResetUseCase.ts`
- `src/application/use-cases/password/ResetPasswordUseCase.ts`

**Archivos a modificar — use cases con IRandomGenerator (2):**
Cada uno: eliminar import y parámetro, reemplazar `this.randomGenerator.generateNumericCode()` por `crypto.randomInt()`, etc.
- `src/application/use-cases/auth/SendTwoFactorCodeUseCase.ts`
- `src/application/use-cases/password/RequestPasswordResetUseCase.ts`

**Archivos a modificar — wiring (1):**
- `src/wiring/auth.ts` — eliminar instanciación de `DateTimeProvider` y `RandomGenerator`, eliminar parámetros en constructores de use cases

**Archivos a modificar — test utils (1):**
- `tests/test-utils/mocks.ts` — eliminar `makeMockDateTimeProvider` y `makeMockRandomGenerator`

### Criterio de éxito
- `npm run build` compila sin errores
- Los flujos de 2FA, password reset, refresh token, Google auth, y login no se ven afectados

---

## Fase 3: Eliminar Value Objects Triviales (Price, DurationMinutes)

**Objetivo:** Eliminar 2 Value Objects que solo añaden validación `> 0`, redundante con Joi (capa de entrada) y Mongoose (validación de esquema).

**Fundamento:** `Price.create(n)` validaba `n > 0`. `DurationMinutes.create(n)` igual. Esa validación ya ocurre en los validators Joi y en los esquemas de Mongoose. `type Price = number` basta.

### Cambios

**Archivos a eliminar (2):**
- `src/domain/value-objects/Price.ts`
- `src/domain/value-objects/DurationMinutes.ts`

**Archivos a modificar — entidades (2):**
- `src/domain/entities/Service.ts`
  - Eliminar `Price` VO import, cambiar tipo `price` en `ServiceProps` de `Price` a `number`
  - Eliminar `Price.create(props.price)` en el constructor
  - Cambiar getter `this.props.price.getValue()` → `this.props.price`
- `src/domain/entities/Appointment.ts`
  - Eliminar `Price` y `DurationMinutes` imports
  - Cambiar tipos en `AppointmentData`: `servicePrice: Price` → `servicePrice: number`, `serviceDuration: DurationMinutes` → `serviceDuration: number`
  - Simplificar `toPrimitives()` y `create()` — eliminar unwrap/wrap de VOs

### Criterio de éxito
- `npm run build` compila sin errores
- Tests de VOs (`price.test.ts`, `duration-minutes.test.ts`) fallarán (esperado, se arreglan en Fase 10)

---

## Fase 4: Eliminar Mappers

**Objetivo:** Eliminar los 6 mappers que copian campo por campo entre documentos Mongoose y entidades de dominio con la misma estructura.

**Fundamento:** Las entidades de dominio y los documentos de MongoDB tienen los mismos campos. El mapper replica el mapping manualmente. Usar los tipos del documento directamente.

### Cambios

**Archivos a eliminar (6):**
- `src/infrastructure/mappers/AppointmentMapper.ts`
- `src/infrastructure/mappers/BarberMapper.ts`
- `src/infrastructure/mappers/ClientMapper.ts`
- `src/infrastructure/mappers/PasswordResetMapper.ts`
- `src/infrastructure/mappers/ServiceMapper.ts`
- `src/infrastructure/mappers/UserMapper.ts`

**Archivos a modificar — repositorios (~7):**
Cada repositorio que use un mapper debe ser actualizado para construir entidades directamente o trabajar con documentos.

- `src/infrastructure/repositories/mongodb/MongoAppointmentRepository.ts`
  - Eliminar uso de `AppointmentMapper`
- `src/infrastructure/repositories/mongodb/MongoBarberRepository.ts`
  - Eliminar uso de `BarberMapper`
- `src/infrastructure/repositories/mongodb/MongoClientRepository.ts`
  - Eliminar uso de `ClientMapper`
- `src/infrastructure/repositories/mongodb/MongoPasswordResetRepository.ts`
  - Eliminar uso de `PasswordResetMapper`
- `src/infrastructure/repositories/mongodb/MongoRefreshTokenRepository.ts`
  - Eliminar uso (si usa mapper)
- `src/infrastructure/repositories/mongodb/MongoUserRepository.ts`
  - Eliminar uso de `UserMapper`
- `src/infrastructure/repositories/static/StaticServiceRepository.ts`
  - Eliminar uso de `ServiceMapper`

**Archivos a modificar — modelos (si es necesario):**
Los modelos de Mongoose deben exponer métodos `toEntity()` o los repositorios construyen entidades directamente.

### Criterio de éxito
- `npm run build` compila sin errores
- Cada repositorio construye entidades de dominio sin pasar por mapper

---

## Fase 5: Fusionar Use Cases Pasamanos en Controllers

**Objetivo:** Eliminar ~15 use cases que son pasamanos puro (CRUD sin lógica de negocio real), moviendo su lógica directamente a los controllers.

**Fundamento:** Use cases como `GetAllBarbersUseCase` (11 líneas, 2 de lógica), `GetBarberScheduleUseCase` (16 líneas, 3 de lógica), `GetCurrentUserUseCase` (15 líneas, 3 de lógica) son indirección pura. Añaden un archivo, un test, y una entrada en wiring sin aportar valor.

### Cambios

**Archivos a eliminar (15):**
- `src/application/use-cases/service/GetAllServicesUseCase.ts`
- `src/application/use-cases/user/GetCurrentUserUseCase.ts`
- `src/application/use-cases/tempLock/CreateTempLockUseCase.ts`
- `src/application/use-cases/tempLock/ReleaseTempLockUseCase.ts`
- `src/application/use-cases/appointment/GetAppointmentsUseCase.ts`
- `src/application/use-cases/appointment/GetAppointmentByIdUseCase.ts`
- `src/application/use-cases/appointment/GetAppointmentsAnonymousUseCase.ts`
- `src/application/use-cases/barber/GetAllBarbersUseCase.ts`
- `src/application/use-cases/barber/GetBarberByIdUseCase.ts`
- `src/application/use-cases/barber/GetBarberScheduleUseCase.ts`
- `src/application/use-cases/barber/UpdateBarberScheduleUseCase.ts`
- `src/application/use-cases/barber/CreateBarberUseCase.ts`
- `src/application/use-cases/barber/UpdateBarberUseCase.ts`
- `src/application/use-cases/barber/DeactivateBarberUseCase.ts`
- `src/application/use-cases/barber/DeleteBarberUseCase.ts`

**Archivos a modificar — controllers (9):**

Cada controller cambia su constructor para recibir repositorios/servicios directamente (en lugar de use cases) y su lógica ahora llama a repositorios directamente.

- `src/interface-adapters/controllers/service/ServiceController.ts`
  - Antes: `constructor(getAllServices: GetAllServicesUseCase)`
  - Después: `constructor(serviceRepository: StaticServiceRepository)`
  - Método `getAll` llama a `this.serviceRepository.findAll()` directamente
- `src/interface-adapters/controllers/user/UserController.ts`
  - Antes: `constructor(getCurrentUser: GetCurrentUserUseCase)`
  - Después: `constructor(userRepository: MongoUserRepository)`
  - Método `getMe` llama a `this.userRepository.findById()` directamente
- `src/interface-adapters/controllers/tempLock/TempLockController.ts`
  - Antes: constructor recibe CreateTempLockUseCase + ReleaseTempLockUseCase
  - Después: constructor recibe `MongoTempLockRepository`
  - Métodos `create` y `release` trabajan directamente con el repo
- `src/interface-adapters/controllers/appointment/AppointmentController.ts`
  - Eliminar parámetros `getAppointments`, `getAppointmentById`, `getAppointmentsAnonymous`
  - Añadir repositorios necesarios para esos métodos
  - Los métodos `getAll`, `getById`, `getAnonymous` trabajan con repos directamente
  - Conservar use cases complejos: `createAppointment`, `cancelAppointment`, `updateStatus`, `reschedule`
- `src/interface-adapters/controllers/barber/BarberController.ts`
  - Eliminar 8 parámetros de use case del constructor
  - Añadir repositorios necesarios (`MongoBarberRepository`, `MongoUserRepository`, `MongoAppointmentRepository`, `MongoTempLockRepository`, `BcryptPasswordHasher`, `NodemailerEmailService`)
  - Conservar `GetAvailableSlotsUseCase` (complejo, usa SlotService)

Controllers que NO cambian (solo cambian su import de presenter, ya hecho en Fase 1):
- `AuthController` — todos sus use cases tienen lógica real
- `AuthGoogleController` — idem
- `TwoFactorController` — idem
- `PasswordRecoveryController` — idem

**Archivos a modificar — wiring (6):**

Cada wiring file cambia para pasar repositorios/servicios directamente a los controllers en lugar de instanciar use cases intermedios.

- `src/wiring/service.ts` — eliminar `GetAllServicesUseCase`, pasar repo directo a controller
- `src/wiring/user.ts` — eliminar `GetCurrentUserUseCase`, pasar repo directo a controller
- `src/wiring/tempLock.ts` — eliminar ambos use cases, pasar repo directo a controller
- `src/wiring/appointment.ts` — eliminar 3 use cases triviales, repos van directo a controller
- `src/wiring/barber.ts` — eliminar 8 use cases triviales, repos van directo a controller
- `src/wiring/auth.ts` — sin cambios (todos los use cases tienen lógica real)

### Criterio de éxito
- `npm run build` compila sin errores
- Cada controller mantiene la misma interfaz pública (mismos métodos expuestos a routes)

---

## Fase 6: Eliminar Interfaces de Repositorio Single-Impl

**Objetivo:** Eliminar las 7 interfaces de repositorio que tienen una sola implementación, usando las implementaciones concretas directamente.

**Fundamento:** Con las 15 interfaces de repositorio en el dominio, solo `IEmailService` tiene 2 implementaciones (Nodemailer + FakeEmail). Las demás (IAppointmentRepository, IBarberRepository, IUserRepository, IRefreshTokenRepository, IPasswordResetRepository, ITempLockRepository, IClientRepository, IServiceRepository) tienen 1 implementación cada una y no hay planes de cambiarlas. La interfaz añade indirección sin beneficio.

### Cambios

**Archivos a eliminar (7):**
- `src/domain/repositories/IAppointmentRepository.ts`
- `src/domain/repositories/IBarberRepository.ts`
- `src/domain/repositories/IClientRepository.ts`
- `src/domain/repositories/IPasswordResetRepository.ts`
- `src/domain/repositories/IRefreshTokenRepository.ts`
- `src/domain/repositories/IServiceRepository.ts`
- `src/domain/repositories/ITempLockRepository.ts`

Nota: `IUserRepository.ts` también sería candidato pero verificar si lo usan los use cases complejos de auth. Si todos tienen 1 impl, también se elimina.

**Archivos a modificar — use cases complejos restantes (~13):**
Cada use case cambia el tipo de sus dependencias de interfaz a implementación concreta. Ejemplo:
- `CreateAppointmentUseCase` cambia `IAppointmentRepository` → `MongoAppointmentRepository`
- `VerifyTwoFactorUseCase` cambia `IUserRepository` → `MongoUserRepository`
- Etc.

Use cases afectados:
- `src/application/use-cases/appointment/CreateAppointmentUseCase.ts`
- `src/application/use-cases/appointment/CancelAppointmentUseCase.ts`
- `src/application/use-cases/appointment/UpdateAppointmentStatusUseCase.ts`
- `src/application/use-cases/appointment/RescheduleAppointmentUseCase.ts`
- `src/application/use-cases/auth/RegisterUserUseCase.ts`
- `src/application/use-cases/auth/AuthenticateWithGoogleUseCase.ts`
- `src/application/use-cases/auth/CompleteGoogleProfileUseCase.ts`
- `src/application/use-cases/auth/SendTwoFactorCodeUseCase.ts`
- `src/application/use-cases/auth/VerifyTwoFactorUseCase.ts`
- `src/application/use-cases/auth/RefreshTokenUseCase.ts`
- `src/application/use-cases/password/RequestPasswordResetUseCase.ts`
- `src/application/use-cases/password/ResetPasswordUseCase.ts`
- `src/application/use-cases/barber/GetAvailableSlotsUseCase.ts`

**Archivos a modificar — wiring (6):**
Los wiring files que instancian use cases complejos actualizan los tipos de los parámetros (el constructor ahora espera implementación concreta). Pero como ya están instanciando implementaciones concretas (ej: `new MongoAppointmentRepository()`), en muchos casos solo hay que cambiar el tipo de la variable, no el constructor real.

### Criterio de éxito
- `npm run build` compila sin errores
- `IUserRepository` se elimina junto con las demás (verificar que no se use en test-utils/modelos)

---

## Fase 7: Consolidar Wiring (6 → 2 archivos)

**Objetivo:** Reducir de 6 archivos de wiring a 2, simplificando la navegación y eliminando duplicación.

**Fundamento:** Después de la Fase 5, los wiring files son mucho más simples. Los archivos `service.ts`, `user.ts`, `tempLock.ts` son de ~5-10 líneas cada uno. Se pueden consolidar por dominio lógico.

### Cambios

**Archivos a eliminar (4):**
- `src/wiring/service.ts`
- `src/wiring/user.ts`
- `src/wiring/tempLock.ts`
- `src/wiring/barber.ts`

**Archivos a crear/modificar (2):**
- `src/wiring/index.ts` — orquestador central que llama a los módulos de wiring
  - Exporta `buildAppRouter()` que monta todos los routers
  - Opcionalmente, las fábricas de rutas se exportan directamente desde aquí

- `src/wiring/auth.ts` — se mantiene (es el más grande y complejo, con 8 use cases)
- `src/wiring/appointment.ts` — se mantiene (CreateAppointmentUseCase + Cancel + Reschedule + UpdateStatus siguen siendo complejos)
- Los wiring de service, user, tempLock, y barber se inlining en `src/app.ts` directamente o en un nuevo `src/wiring/routers.ts`

Alternativa: fusionar `auth.ts` + `appointment.ts` en `src/wiring/index.ts` para tener un solo archivo de wiring. Evaluar según la complejidad resultante.

### Criterio de éxito
- `npm run build` compila sin errores
- `src/app.ts` importa desde los nuevos wiring files

---

## Fase 8: Simplificar Entidad Appointment (~299 → ~100 líneas)

**Objetivo:** Reducir la entidad `Appointment.ts` eliminando los 3 tipos duplicados, getters redundantes, y simplificando el boilerplate de creación/mapeo.

**Fundamento:** `Appointment.ts` tiene 299 líneas de las cuales ~60% son boilerplate:
- `AppointmentCreateProps` (24 campos) y `AppointmentPrimitives` (24 campos) son **idénticos**
- `AppointmentData` (24 campos con VOs) es el mismo tipo con Price/DurationMinutes ya eliminados en Fase 3
- La clase tiene 24 getters (1 por campo) que no añaden encapsulación real
- `toPrimitives()` replica todos los campos manualmente

### Cambios

**Archivos a modificar (1):**
- `src/domain/entities/Appointment.ts`

**Refactor:**
1. Colapsar `AppointmentCreateProps`, `AppointmentPrimitives`, y `AppointmentData` en un solo tipo `AppointmentProps` (todos son el mismo conjunto de campos)
2. Eliminar los 24 getters, hacer `props` público y readonly
3. Simplificar `create()` para que acepte `AppointmentProps` directamente (sin convertir VOs)
4. Eliminar `toPrimitives()` (los consumers usan `appointment.props` directamente)
5. Mantener métodos de negocio: `cancel()`, `complete()`, `pay()`, `markNoShow()`, `addStatusHistoryEntry()`

**Efecto en otros archivos:**
Los consumers que llaman `appointment.toPrimitives()` ahora usan `appointment.props`. Los repositorios actualizan el acceso a campos.

Archivos que referencian `toPrimitives()`:
- Repositorios (actualizar en Fase 4)
- Use cases que convierten entities a DTOs (actualizar a `appointment.props`)
- Controllers (si algún controller usa primitivas directamente)

### Post-refactor estimado

```typescript
export type AppointmentProps = {
  id: string;
  barberId: string;
  clientId?: string;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  createdBy?: CreatedBy;
  statusHistory: StatusHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
};

export class Appointment {
  constructor(public readonly props: AppointmentProps) {}

  static create(props: AppointmentProps): Appointment {
    return new Appointment(props);
  }

  cancel(reason?: string, cancelledBy?: string): void { /* ... */ }
  complete(): void { /* ... */ }
  pay(method: PaymentMethod): void { /* ... */ }
  markNoShow(): void { /* ... */ }
  addStatusHistoryEntry(entry: StatusHistoryEntry): void { /* ... */ }
}
```

### Criterio de éxito
- `npm run build` compila sin errores
- Appointment.ts tiene ~100-120 líneas (vs 299 actuales)
- No hay regresiones en la máquina de estados de Appointment

---

## Fase 9: Consolidar DTOs Redundantes

**Objetivo:** Eliminar DTOs que son copia exacta de las primitivas de las entidades de dominio.

**Fundamento:** Muchos DTOs en `application/dto/` tienen los mismos campos que sus entidades correspondientes. Por ejemplo, `ServiceResponseDTO.ts` es idéntico a `ServicePrimitives`. Los DTOs de barber también duplican los campos de `Barber`.

### Cambios

**DTOs candidatos a eliminar (~10):**
- `src/application/dto/service/ServiceResponseDTO.ts` — usar `ServicePrimitives` directamente
- `src/application/dto/barber/BarberResponseDTO.ts` — usar primitivas de Barber
- `src/application/dto/barber/CreateBarberDTO.ts` — usar `Pick<BarberPrimitives, ...>`
- `src/application/dto/barber/UpdateBarberDTO.ts` — usar `Partial<BarberPrimitives>`
- `src/application/dto/appointment/AppointmentResponseDTO.ts` — usar `AppointmentProps`
- `src/application/dto/appointment/CreateAppointmentDTO.ts` — inline en el validator
- `src/application/dto/appointment/RescheduleAppointmentDTO.ts` — inline
- `src/application/dto/auth/LoginUserDTO.ts` — inline en validator
- `src/application/dto/auth/RegisterUserDTO.ts` — inline en validator
- `src/application/dto/auth/TwoFactorSendDTO.ts` — inline
- `src/application/dto/auth/TwoFactorVerifyDTO.ts` — inline
- `src/application/dto/auth/GoogleLoginDTO.ts` — inline
- `src/application/dto/auth/CompleteGoogleProfileDTO.ts` — inline
- `src/application/dto/password/RequestResetDTO.ts` — inline
- `src/application/dto/password/ResetPasswordDTO.ts` — inline

**Estrategia:**
- DTOs que son output (respuesta): eliminar, usar `entity.props` o `entity.toPrimitives()` directamente
- DTOs que son input (creación/actualización): mover tipos a los validators Joi, eliminar archivo DTO separado
- La validación Joi ya define la forma de los datos de entrada. No necesita un type duplicado.

**Archivos a modificar (~15):**
- Use cases que referencian DTOs (actualizar imports/tipos)
- Controllers que referencian DTOs
- Validators que pueden absorber los tipos inline
- Wiring files (si algún DTO se importa ahí)

### Criterio de éxito
- `npm run build` compila sin errores
- Los endpoints devuelven la misma estructura de respuesta

---

## Fase 10: Arreglar y Consolidar Tests

**Objetivo:** Actualizar todos los tests rotos por las fases anteriores y aplicar las mejoras de la auditoría de tests.

### Cambios

**1. Actualizar imports y mocks (~45 archivos de test)**

Cada test que importaba de archivos eliminados o modificados necesita actualización:
- Tests de presenters eliminados (4 tests si existen)
- Tests de use cases eliminados (~15 tests a eliminar)
- Tests de use cases que cambiaron de interfaz a concreto
- Tests de mappers eliminados (~6 tests)
- Tests de VOs eliminados (Price, DurationMinutes — 2 tests)

**2. Aplicar mejoras de AUDITORIA-TESTS.md**

| Prioridad | Acción | Archivos |
|:---------:|--------|:--------:|
| 🔴 | Arreglar mock de error en `barber.routes.test.ts` (objeto plano vs AppError) | 1 |
| 🟡 | Reforzar ~32 `toHaveBeenCalled()` → `toHaveBeenCalledWith()` | ~15 archivos |
| 🟡 | Agregar `afterEach` cleanup a `auth.routes.test.ts` | 1 |
| 🟡 | Arreglar test vacuo de `StepIndicator` (mover assert dentro del `if`) | 0 (frontend) |
| 🟢 | Reemplazar `toBeTruthy()` en mensajes por `toBe('mensaje exacto')` | 2 |
| 🔴 | Tests de `password-reset.usecase.test.ts` — mock `appointmentRepository` muerto | 1 |

**3. Consolidar mock factories**

`tests/test-utils/mocks.ts` ya tiene factories para la mayoría de repos. Actualizar:
- Eliminar `makeMockDateTimeProvider` y `makeMockRandomGenerator` (ya hechos en Fase 2)
- Los tests de use cases que ahora usan repos concretos en lugar de interfaces necesitan mocks adaptados
- Eliminar mocks muertos (métodos mockeados pero nunca referenciados)

**4. Tests a eliminar**
- Tests de use cases eliminados en Fase 5 (~15 archivos)
  - `tests/modules/service/use-cases/get-all-services.usecase.test.ts`
  - `tests/modules/user/use-cases/get-current-user.usecase.test.ts`
  - `tests/modules/tempLock/use-cases/create-templock.usecase.test.ts`
  - `tests/modules/tempLock/use-cases/release-templock.usecase.test.ts`
  - `tests/modules/barber/use-cases/barber-schedule.usecase.test.ts`
  - `tests/modules/barber/use-cases/create-barber.usecase.test.ts`
  - `tests/modules/barber/use-cases/deactivate-barber.usecase.test.ts`
  - `tests/modules/barber/use-cases/update-barber.usecase.test.ts`
  - `tests/modules/appointment/use-cases/get-appointment-by-id.usecase.test.ts`
  - `tests/modules/appointment/use-cases/get-appointments-anonymous.usecase.test.ts`
- Tests de mappers eliminados (~6 archivos)
- Tests de VOs eliminados (price.test.ts, duration-minutes.test.ts)

**5. Tests a modificar**
- Tests de controllers que ahora reciben repos en lugar de use cases
- Tests de use cases complejos que cambiaron tipos de dependencias
- Tests de repositorios que ya no usan mappers

### Criterio de éxito
- `npm test` (o equivalente) pasa con al menos la misma cobertura que antes
- No hay tests rotos ni frágiles

---

## Mapa de Dependencias entre Fases

```
Fase 1 (response.ts)
  ↓ (ninguna — independiente)
Fase 2 (kill wrappers)
  ↓ (ninguna — independiente)
Fase 3 (kill VOs)
  ↓ (necesaria para Fase 8 — Appointment entity)
Fase 4 (kill mappers)
  ↓ (necesaria para Fase 6 — repos usan tipos directos)
Fase 5 (merge use cases en controllers)
  ↓ (necesaria para Fase 7 — wiring más simple)
Fase 6 (kill interfaces repos)
  ↓ (necesaria para Fase 7 — wiring más simple)
Fase 7 (consolidar wiring)
  ↓ (depende de Fase 5 + 6)
Fase 8 (simplificar Appointment)
  ↓ (independiente, pero más fácil después de Fase 3)
Fase 9 (consolidar DTOs)
  ↓ (más fácil después de Fase 5 + 8 — menos use cases, entity más simple)
Fase 10 (tests)
  ↓ (depende de TODAS las fases anteriores)
```

Las fases 1, 2, 3, 4 son independientes entre sí y se pueden ejecutar en paralelo.
Las fases 5, 6, 7 son secuenciales (cada una simplifica el resultado de la anterior).
La fase 8 y 9 son independientes de 5-6-7 pero dependen de 3.
La fase 10 es siempre al final.

---

## Estado Final Estimado

### Archivos restantes (~60)

```
src/
├── app.ts, index.ts
├── common/
│   └── response.ts              # sendSuccess + sendError
├── application/
│   ├── dto/                     # Solo DTOs con transformación no-trivial
│   ├── errors/
│   │   └── AppError.ts
│   ├── ports/
│   │   ├── IEmailService.ts     # 2 implementaciones → se mantiene
│   │   ├── IGoogleAuthService.ts
│   │   ├── IHashService.ts
│   │   ├── IPasswordHasher.ts
│   │   └── ITokenService.ts
│   └── use-cases/               # Solo ~13 con lógica real
│       ├── appointment/         # CreateAppointment, CancelAppointment, UpdateStatus, Reschedule
│       ├── auth/                # ~6 use cases (Register, Google, 2FA send/verify, Refresh, CompleteProfile)
│       ├── barber/              # GetAvailableSlots
│       └── password/            # RequestPasswordReset, ResetPassword
├── domain/
│   ├── entities/                # 7 entidades (Appointment simplificada)
│   ├── services/
│   │   └── SlotService.ts
│   ├── types/
│   ├── utils/
│   │   └── time.ts
│   └── value-objects/           # Solo Email, Phone, Password
├── infrastructure/
│   ├── config/                  # env, db, mailer, services
│   ├── repositories/
│   │   └── mongodb/             # 7 implementaciones (sin interfaces, sin mappers)
│   │   └── static/              # StaticServiceRepository
│   ├── scripts/
│   │   └── seed.ts
│   └── services/                # JwtTokenService, BcryptPasswordHasher, NodemailerEmailService,
│                                # FakeEmailService, GoogleAuthService, HashService
├── interface-adapters/
│   ├── controllers/             # 9 controllers (con repos/servicios inyectados directamente)
│   ├── middlewares/              # auth, validation
│   ├── routes/                  # 6 route files
│   └── validators/              # 4 validators
└── wiring/
    └── index.ts                 # ~1-2 archivos consolidados
```

### Reducción

| Métrica | Antes | Después | Reducción |
|---------|:-----:|:-------:|:---------:|
| Archivos fuente backend | ~131 | ~60 | **~54%** |
| Use cases | 28 | ~13 | **~54%** |
| Interfaces repositorio | 8 | 4 (solo servicios externos) | **50%** |
| Mappers | 6 | 0 | **100%** |
| Presenters | 4 | 0 (1 response helper) | **100%** |
| Value Objects triviales | 5 | 3 (solo Email, Phone, Password) | **40%** |
| Archivos wiring | 6 | ~2 | **~67%** |
| Líneas Appointment.ts | 299 | ~100 | **~67%** |
| DTOs | ~17 | ~5 | **~70%** |

---

## Notas sobre Riesgos

1. **Fase 5 es la de mayor riesgo**: Mover lógica de 15 use cases a controllers requiere cuidado para no perder manejo de errores o validaciones. Cada use case debe revisarse individualmente.

2. **Fase 10 puede ser extensa**: ~45 tests necesitan actualización. Si la cobertura es crítica, considerar hacer la Fase 10 en 2 sub-fases: (a) arreglar imports/eliminar tests de archivos borrados, (b) reforzar assertions débiles.

3. **Compatibilidad hacia atrás**: Ninguna fase debe cambiar la API pública (rutas, formato de request/response). Si algún cambio de DTO afecta la respuesta, debe mantenerse la estructura.

4. **Los tests se rompen entre fases**: Dado que los tests se arreglan al final, entre la Fase 1 y la Fase 9 los tests estarán en estado rojo. Esto es intencional. Se recomienda tener un entorno de staging para validar cada fase manualmente.

5. **Commits intermedios**: Se recomienda commit por fase para poder revertir cambios específicos si algo sale mal.
