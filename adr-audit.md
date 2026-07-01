# Auditoría de ADRs — Estado vs Código Actual

Fecha: 2026-06-25

---

## ADRs que CAMBIARON (la implementación actual difiere de lo documentado)

| ADR | Título | Decisión original | Estado actual en código | Por qué cambió |
|-----|--------|-------------------|------------------------|----------------|
| **ADR-013** | Redux Thunks sobre RTK Query | Usar solo `createAsyncThunk`; no usar RTK Query | El frontend ahora usa **ambos**: `authApi.ts`, `appointmentApi.ts` y `analyticsApi.ts` usan `createApi` de RTK Query, además de los thunks tradicionales | Se introdujo RTK Query posteriormente para endpoints con caching más conveniente (auth, appointments, analytics), sin eliminar los thunks existentes. Se convivieron ambas estrategias. |
| **ADR-014** | Clean Architecture + DI Manual | Archivos de wiring separados: `auth.ts`, `barber.ts`, `appointment.ts`, `service.ts`, `tempLock.ts` | `wiring/` contiene solo `auth.ts`, `appointment.ts` e `index.ts`. El wiring de barber, service y tempLock está **inline** en `index.ts`. | Se consolidó el wiring en `index.ts` por simplicidad, centralizando la composición de dependencias en un solo orquestador en vez de archivos separados por módulo. |
| **ADR-016** | AppError + Presenter Pattern | Presenters por módulo: `AuthPresenter`, `BarberPresenter`, `AppointmentPresenter`, `ServicePresenter` con métodos `success()` y `handleError()` | **No existe ningún Presenter.** Los controladores manejan respuestas directamente con `res.status().json()`. Solo `AppError` se mantiene. | Se abandonó el patrón Presenter en favor de manejo directo en controladores, simplificando el código. Las respuestas se construyen inline sin la capa de presentación estática. |
| **ADR-018** | Value Objects de Dominio | `Email`, `Phone`, `Price`, `DurationMinutes` como VOs | Solo existen `Email.ts` y `Phone.ts`. **`Price.ts` y `DurationMinutes.ts` no existen** — se usan `number` planos en entidades (`Appointment.servicePrice`, `Barber.slotDuration`). | Nunca se implementaron `Price` y `DurationMinutes` como value objects. La validación de precio/duración se hace inline en las entidades o se omite. |
| **ADR-019** | Static Service Repository | `StaticServiceRepository` implementa `IServiceRepository` | `StaticServiceRepository` **no implementa ninguna interfaz** — `IServiceRepository` no existe en el código. Los casos de uso referencian la clase concreta directamente. | Se eliminó la interfaz `IServiceRepository` presumiblemente por ser una abstracción sin implementaciones alternativas; el `StaticServiceRepository` es la única implementación. |

---

## ADRs que SE MANTIENEN (la decisión documentada sigue siendo verdadera)

| ADR | Título | Verificación |
|-----|--------|-------------|
| **ADR-001** | Lean Cast Strategy | `IBarberRaw`/`IEmployeeRaw`/`IAdminRaw` existen sin extender `Document`; `isBarberRaw()` en guards valida en runtime; no hay `as unknown as` en repositorios |
| **ADR-002** | Timing Safe 2FA | `IHashService.constantTimeEqual()` usa `crypto.timingSafeEqual()`; `VerifyTwoFactorUseCase` lo utiliza para comparar hashes |
| **ADR-003** | Account Lockout | Campos `twoFactorFailedAttempts`, `twoFactorLockedUntil`, `resetFailedAttempts`, `resetLockedUntil` en `User`; umbral 5 intentos, duración 15 min |
| **ADR-004** | Password Strength Policy | `Password.ts` valida min 8 chars + mayúscula + minúscula + dígito; Joi y frontend replican las reglas |
| **ADR-005** | Auth Error Messages Diferenciados | Los mensajes aún revelan el tipo de cuenta (local vs Google) — por decisión consciente del ADR |
| **ADR-006** | Partial Token JWT | `signPartialToken`/`verifyPartialToken` existen en `JwtTokenService` con `type: 'partial'` y expiración de 5 min |
| **ADR-007** | HMAC Refresh Token | `HashService.sha256` usa `crypto.createHmac` con `REFRESH_HASH_SECRET` como variable requerida |
| **ADR-008** | E2E 2FA Code Capture | `FakeEmailService` existe con `getCode(email)`; endpoint `GET /__test/two-factor-code` en test-server |
| **ADR-009** | Express 5 | `express@^5.2.1` en `package.json` |
| **ADR-010** | Mandatory 2FA Flow | No existe `/auth/login` directo; el único flujo de login es `2fa/send` → `2fa/verify` |
| **ADR-011** | MongoDB Discriminators | `barber.model.ts` y `client.model.ts` usan `discriminatorKey: 'kind'` con sub-modelos Admin/Empleado y Registrado/NoRegistrado |
| **ADR-012** | Frontend Stack | Vite ^8.0.10, Tailwind ^4.2.4, Framer Motion ^12.38.0, React Router DOM ^7.14.2 |
| **ADR-015** | Joi Validation | `auth.validator.ts`, `barber.validator.ts`, `appointment.validator.ts`, `recovery.validator.ts` existen con Joi ^18.1.2 |
| **ADR-017** | Dual Collection User Model | `MongoUserRepository.findByEmail()` consulta `Barber` primero y luego `RegisteredClient` secuencialmente |
| **ADR-020** | Appointment State Machine | `AppointmentStatus` = `'Confirmado'\|'Completado'\|'Cancelado'\|'NoShow'`; métodos `cancel()`, `complete()`, `markNoShow()`, `pay()` con `VALID_TRANSITIONS` |
| **ADR-021** | TempLock Slot Reservation | Schema con `barberId`, `date`, `startTime`, `clientId?`, `createdAt`; TTL 300s; unique index compuesto |
| **ADR-022** | Rate Limiting per Route | 8 rate limiters configurados (loginLimiter, registerLimiter, resetLimiter, twoFALimiter, googleLimiter, refreshLimiter + tempLockLimiter, anonymousLimiter) |
| **ADR-023** | Axios Interceptor + Refresh Queue | `isRefreshing` flag, `failedQueue`, interceptor 401 excluye `/auth/`, refresh con `POST /auth/refresh` |

---

## Resumen

- **ADRs mantenidos**: 18 de 23 (78%)
- **ADRs con cambios/degradación**: 5 de 23 (22%)
  - `ADR-013`: Violación — se agregó RTK Query pese a la decisión original
  - `ADR-014`: Cambio estructural — wiring consolidado en `index.ts`
  - `ADR-016`: Abandono completo del patrón Presenter
  - `ADR-018`: Implementación parcial — faltan `Price` y `DurationMinutes`
  - `ADR-019`: Degradación menor — falta la interfaz `IServiceRepository`
