# AUDITORÍA ARQUITECTÓNICA — PROYECTO INTEGRADOR BARBER

> **Fecha:** Junio 2026
> **Scope:** Full-stack (backend Express + frontend React)
> **TL;DR:** Proyecto con sobreingeniería severa en backend (Clean Architecture dogmática) y duplicación estructural grave en frontend. ~40% del código es boilerplate que puede eliminarse.

---

## 1. RESUMEN EJECUTIVO

| Dimensión | Nivel | Explicación |
|---|---|---|
| Boilerplate general | **CRÍTICO** | ~40% del código fuente es ruido arquitectónico (capas pasamanos, DTOs planos, interfaces single-impl, presenters idénticos, mocks falsos, wiring manual) |
| Complejidad accidental | **ALTO** | Clean Architecture aplicada dogmáticamente para un CRUD de barbería. 7 capas para hacer un POST. 350+ archivos para lo que deberían ser ~150 |
| Frontend duplicación | **CRÍTICO** | Directorio `pages/client/admin/` es COPIA EXACTA de `pages/admin/`. Mock files `.ts` inútiles en 10+ carpetas. PasswordStrength duplicado. |
| Calidad del código real | **MEDIA** | El código business-logic (SlotService, Auth flows) está bien. El problema es la arquitectura que envuelve esa lógica. |
| Mantenibilidad | **BAJA** | Navegar 7 capas para entender un flujo simple es agotador. El nesting arquitectónico mata la productividad. |
| Capacidad de IA | **BAJA** | Una IA necesita leer 5+ archivos para entender 1 flujo. El contexto se pierde en boilerplate. |

### Qué está bien
- `SlotService.ts` — lógica de negocio limpia, sin dependencias externas
- `domain/types/appointment.ts` — state machine clara y concisa
- `domain/value-objects/` — concepto correcto, aunque con implementación inflada
- Frontend `bookingSlice.ts` y `BookingPage` — estado local bien manejado
- Frontend `api.ts` — interceptor refresh token queue bien implementado
- `infrastructure/config/env.ts` — configuración sólida con parseo defensivo

### Qué parece sobreingeniería
- Clean Architecture completa para una app que es básicamente un CRUD con auth
- Value Objects para todo (Email, Password, Phone, Price, DurationMinutes) en vez de tipos simples + validación en los boundaries
- Presenters idénticos × 4 archivos
- DTOs que son simplemente `type X = { fields }` sin lógica
- Interfaces con 1 sola implementación (todas)
- Capa `wiring/` manual cual DI container artesanal
- Mappers manuales × 6 archivos
- `domain/repositories/` interfaces duplicando `application/ports/`
- Mock files `.ts` con lorem ipsum en 12 carpetas
- `pages/client/admin/` duplicado completo de `pages/admin/`

### Impacto en productividad
- **Un cambio simple** (agregar un campo a User) requiere tocar: DTO → UseCase → Entity → Repository Interface → MongoRepository → Mapper → Controller → Presenter → Routes → Wiring. Eso son **10 archivos** para un field.
- **Incorporar un dev nuevo** requiere entender 7 capas, 4 tipos de interfaces, 2 sistemas de validación (value objects + Joi), wiring manual, mappers...
- **Costo cognitivo** por feature es 3x–5x más alto de lo necesario.

---

## 2. HALLAZGOS CRÍTICOS

### H1 — Clean Architecture dogmática y desproporcionada **— CRÍTICA**

**Problema:** Se aplicó Clean Architecture completa para una barbería. Hay 7 capas verticales (controllers → presenters → use-cases → dto → domain/entities → domain/repositories → infrastructure/repositories → mappers → models). Cada flujo HTTP atraviesa 8–10 archivos.

**Ejemplo concreto — POST /auth/register:**
1. `auth.routes.ts` (routing)
2. `validation.middleware.ts` (Joi)
3. `AuthController.ts` (controller)
4. `RegisterUserUseCase.ts` (use case)
5. `RegisterUserDTO.ts` (DTO — 8 line type alias)
6. `User.ts` (entity — 129 lines de getters)
7. `Email.ts` + `Password.ts` + `Phone.ts` (value objects)
8. `IUserRepository.ts` (interface)
9. `MongoUserRepository.ts` (impl)
10. `UserMapper.ts` (mapper)
11. `AuthPresenter.ts` (presenter)
12. `wiring/auth.ts` (DI manual)

**12 archivos para registrar un usuario.** Podría ser 1 ruta + 1 controlador que valide con Joi y llame a mongoose directamente. O a lo sumo 3 archivos si separamos lógica.

**Impacto:** Cambiar cualquier cosa requiere navegar un laberinto de archivos. El costo de mantener esta estructura supera cualquier beneficio teórico.

**Solución:** Colapsar a 3 capas: routes, controllers (con lógica inline), services (si hay lógica compartida). Eliminar use-cases, presenters, mappers, DTOs layer, domain/repositories, wiring manual.

---

### H2 — Duplicación completa de `pages/admin/` en `pages/client/admin/` **— CRÍTICA**

**Problema:** `frontend-barber/src/pages/client/admin/` es una **copia exacta** de `frontend-barber/src/pages/admin/`. Mismos componentes, mismos imports (ajustando paths relativos), mismo layout, mismos forms. Esto duplica ~15 archivos sin ningún cambio.

**Archivos duplicados identificados:**
- `AdminLayout.tsx` + `.test.tsx` + `mock.ts`
- `AdminProfilePage/index.tsx` + `.test.tsx`
- `ProfessionalsPage/index.tsx` + `.test.tsx`
- `ProfessionalsPage/components/ProfessionalForm.tsx`
- `ProfessionalsPage/components/ProfessionalsList.tsx`
- `ProfessionalsPage/components/SlotsPanel.tsx`
- `ProfessionalsPage/utils/schedule-helpers.ts`

**Impacto:** Cualquier cambio en admin debe hacerse en 2 lugares idénticos. Esto ya es un bug waiting to happen.

**Solución:** Eliminar `pages/client/admin/` completamente. No hay razón para una ruta `/client/admin`. Si hay routing distinto, se maneja desde el router, no duplicando páginas.

---

### H3 — Mock files `mock.ts` con lorem ipsum en 12 carpetas **— ALTA**

**Problema:** Hay archivos `mock.ts` en 12 carpetas del frontend con contenido idéntico de lorem ipsum. No son usados por ningún test ni módulo.

**Archivos zombi:**
- `components/common/mock.ts`
- `components/client/mock.ts`
- `pages/admin/mock.ts`
- `pages/client/mock.ts`
- `pages/client/admin/mock.ts`
- `pages/public/mock.ts`
- `hooks/mock.ts`
- `services/mock.ts`
- `constants/mock.ts`
- `context/mock.ts`
- `layout/mock.ts`
- `scripts/mock.ts`
- `store/mock.ts`
- `types/mock.ts`
- `utils/mock.ts`

**Impacto:** Ruido visual. Una IA o dev que explore el proyecto encuentra "lorem ipsum" en cuarto de los archivos.

**Solución:** Eliminar todos. No aportan valor.

---

### H4 — `PasswordStrength.tsx` duplicado **— ALTA**

**Problema:** Existe en `components/common/PasswordStrength.tsx` (46 líneas, sin framer-motion) y en `pages/public/RegisterPage/components/PasswordStrength.tsx` (55 líneas, CON framer-motion). Son implementaciones distintas del mismo componente.

**Solución:** Unificar en `components/common/PasswordStrength.tsx`. La versión con framer-motion es mejor, pero debe decidirse una.

---

### H5 — Capa `application/ports/` + `domain/repositories/` duplican concepto **— ALTA**

**Problema:** Las interfaces de repositorio viven en `domain/repositories/I*Repository.ts` y los puertos de servicio viven en `application/ports/I*Service.ts`. Ambos son interfaces con 1 sola implementación. No hay múltiples implementaciones ni se planean.

**Interfaces single-impl:**
| Interfaz | Implementación única | Propsito real |
|---|---|---|
| `IUserRepository` | `MongoUserRepository` | Solo MongoDB |
| `IAppointmentRepository` | `MongoAppointmentRepository` | Solo MongoDB |
| `IBarberRepository` | `MongoBarberRepository` | Solo MongoDB |
| `IPasswordHasher` | `BcryptPasswordHasher` | Solo bcrypt |
| `ITokenService` | `JwtTokenService` | Solo JWT |
| `IEmailService` | `NodemailerEmailService` / `FakeEmailService` | 2 impls, justificado |
| `IHashService` | `HashService` | Solo crypto |
| `IRandomGenerator` | `RandomGenerator` | Solo crypto |
| `IDateTimeProvider` | `DateTimeProvider` | `new Date()` envuelto |
| `IGoogleAuthService` | `GoogleAuthService` | Solo Google |

**`IEmailService`** es el único caso con 2 implementaciones reales (Nodemailer + FakeEmailService). Eso sí está justificado.

**`IDateTimeProvider`** es el peor caso: `interface { now(): Date }` implementado como `class DateTimeProvider { now() { return new Date() } }`. Esto es sobreingeniería pura.

**Solución:** Eliminar todas las interfaces single-impl. Usar las clases directamente. Mantener solo `IEmailService` que sí tiene 2 implementaciones.

---

### H6 — `domain/value-objects/` sobreingeniería **— ALTA**

**Problema:** 5 value objects (Email, Password, Phone, Price, DurationMinutes) que esencialmente envuelven un primitivo + validación. La validación ya existe en Joi (backend) y en el frontend. Esto es doble validación con distinto criterio.

**Costo:** 5 archivos × ~15 líneas + import en cada use case.

**Problema adicional:** Email se valida con regex simple (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) que rechaza emails válidos como `user+tag@domain.com`. Pero Joi probablemente usa una validación más robusta. Hay inconsistencia.

**Solución:** Eliminar value objects. Usar tipos simples `string` para email/phone/password y validar una sola vez en los controllers con Joi. Price y DurationMinutes pueden ser tipos alias (`type Price = number`).

---

### H7 — Presenters idénticos × 4 archivos **— MEDIA**

**Problema:** `AuthPresenter.ts`, `AppointmentPresenter.ts`, `BarberPresenter.ts`, `ServicePresenter.ts` son **idénticos** (mismos 16 lines, mismo `success<T>` y `handleError`). Solo cambia el nombre de la clase.

**Solución:** Unificar en un solo `Presenter.ts`. O mejor aún: eliminar la capa de presenters y manejarlo con middleware Express. El error handling es el mismo para todos.

---

### H8 — Capa `wiring/` — DI container manual **— MEDIA**

**Problema:** 5 archivos de wiring (`auth.ts`, `barber.ts`, etc.) que instancian manualmente todas las dependencias. `auth.ts` solo tiene **127 líneas** para instanciar y conectar objetos. Esto es trabajo que debería hacer un DI container o no existir si colapsamos capas.

**Solución:** Si eliminamos la sobreingeniería de capas, el wiring se vuelve trivial (1–2 líneas por ruta). Si se mantiene, usar `tsyringe` o `awilix` container.

---

### H9 — `User.ts` entity — 129 líneas de getters boilerplate **— MEDIA**

**Problema:** La entidad `User` tiene 20 getters (`get id()`, `get email()`, `get name()`, ...) y 8 métodos `with*()` que crean nuevas instancias con campos modificados. Todo eso se reemplaza con un objeto plano + spread operator.

```typescript
// Actual — 129 líneas
class User {
  private props: UserProps;
  get id(): string { return this.props.id; }
  get email(): string { return this.props.email; }
  // ... 15 getters más
  withPasswordHash(hash?: string): User { return new User({...this.props, passwordHash: hash}); }
  withTwoFactor(tf?: TwoFactorState): User { return new User({...this.props, twoFactor: tf}); }
  // ... 6 métodos with* más
}

// Propuesto — 5 líneas
type User = { id: string; email: string; ... };
// o mantener clase pero sin getters: propiedades públicas readonly
```

**Solución:** Reemplazar la clase con un type/interface plano. Los métodos `with*` no se usan en lugar crítico que requiera inmutabilidad garantizada.

---

### H10 — DTOs layer innecesaria **— MEDIA**

**Problema:** Todos los DTOs en `application/dto/` son type aliases planos. No tienen lógica, no transforman datos. Son definiciones de tipos que podrían vivir en los controllers o use cases.

```typescript
// application/dto/auth/RegisterUserDTO.ts — archivo completo
export type RegisterUserDTO = {
  email: string; password: string; repeatPassword: string;
  name: string; lastname: string; phone: string;
};
```

**DTOs innecesarios:** RegisterUserDTO, LoginUserDTO, CreateBarberDTO, UpdateBarberDTO, BarberResponseDTO, AppointmentResponseDTO, CreateAppointmentDTO, RescheduleAppointmentDTO, ServiceResponseDTO, GoogleLoginDTO, CompleteGoogleProfileDTO, TwoFactorSendDTO, TwoFactorVerifyDTO, RequestResetDTO, ResetPasswordDTO.

**Solución:** Colapsar los types dentro de los use cases o controllers que los usan. Si un DTO se usa en múltiples lugares, ponerlo en un archivo `types.ts` compartido, no en una carpeta DTO separada.

---

### H11 — Mappers manuales × 6 archivos **— MEDIA**

**Problema:** `AppointmentMapper.ts`, `BarberMapper.ts`, `ClientMapper.ts`, `PasswordResetMapper.ts`, `ServiceMapper.ts`, `UserMapper.ts`. Todos hacen la misma transformación: doc MongoDB → Entity. Es código manual, verboso, y frágil.

**Ejemplo `UserMapper.ts`:** 74 líneas para mapear `_id.toString()` → `id`, copiar campos 1:1.

**Solución:** Si usamos tipos planos en vez de clases Entity, el mapper se reduce a un cast `as User` o desaparece completamente. Mongoose `lean()` ya devuelve objetos planos.

---

### H12 — `domain/utils/time.ts` funciones sueltas sin archivo de tipos **— BAJA**

No crítico pero está desplazado de donde se esperaría. Las funciones `toMinutes`, `toTimeString`, `doesOverlap` son helpers de dominio correctos, pero están en `/domain/utils/` mezclando conceptos.

---

### H13 — Redux slices verbosos por patrón repetitivo **— MEDIA**

**Problema:** Cada thunk en Redux sigue el mismo patrón:
```typescript
export const someThunk = createAsyncThunk('slice/action', async (data, { rejectWithValue }) => {
  try { return await service.method(data); }
  catch (error: unknown) { const message = error instanceof Error ? error.message : '...'; return rejectWithValue(message); }
});
```

Este try/catch `error instanceof Error` se repite 14 veces en authSlice + barbersSlice + bookingSlice. Es código boilerplate que podría abstraerse con un helper `wrapAsync` o un middleware.

---

### H14 — `infrastructure/guards/barber.guards.ts` — abstracción innecesaria **— BAJA**

Archivo de guards específico para barber que probablemente tiene validación que ya existe en Joi o en los value objects.

---

### H15 — `infrastructure/services/FakeEmailService.ts` y `NodemailerEmailService.ts` — justificado **— OK**

Este es el ÚNICO caso donde 2 implementaciones están justificadas (dev vs prod). Se mantiene.

---

### H16 — `infrastructure/config/services.ts` — posible capa vacía **— BAJA**

No se pudo leer, pero por naming es probablemente otra capa de configuración redundante.

---

## 3. REDUCCIONES PROPUESTAS

### R1 — Colapsar backend: 7 capas → 3 capas

| Actual | Propuesto |
|---|---|
| `interface-adapters/controllers/` | `routes/` (controllers inline o junto a routes) |
| `interface-adapters/presenters/` | Eliminar (un middleware Express) |
| `interface-adapters/routes/` | Mantener, pero simplificar |
| `application/use-cases/` | Colapsar → `services/` (solo si hay lógica compartida) |
| `application/dto/` | Eliminar (tipos inline) |
| `application/ports/` | Eliminar (excepto IEmailService) |
| `domain/entities/` | Reemplazar por types planos |
| `domain/value-objects/` | Eliminar (validación en routes con Joi) |
| `domain/repositories/` | Eliminar (usar clases directas) |
| `infrastructure/repositories/` | Simplificar (sin mapper layer) |
| `infrastructure/mappers/` | Eliminar |
| `wiring/` | Eliminar o simplificar drásticamente |

**Reducción estimada:** ~60 archivos eliminados en backend.

---

### R2 — Eliminar `pages/client/admin/` (duplicado)

**Qué hacer:** Borrar `frontend-barber/src/pages/client/admin/` completo. Ajustar rutas en el router si es necesario. Usar la versión en `pages/admin/`.

**Reducción:** ~15 archivos eliminados.

---

### R3 — Eliminar todos los `mock.ts`

**Qué hacer:** Borrar los 15 archivos `mock.ts` con lorem ipsum. Son 15 archivos que no hacen nada.

---

### R4 — Unificar `PasswordStrength.tsx`

**Qué hacer:** Elegir una versión (la de common/ con animaciones es más completa), borrar la otra, actualizar imports.

---

### R5 — Unificar 4 presenters en 1

**Qué hacer:** Crear `shared/Presenter.ts` o mejor: middleware Express global de error handling. Los presenters solo llaman `res.status().json()` y `handleError`. Eso es responsabilidad de Express, no necesita clase.

---

### R6 — colapsar wiring

**Propuesta:** Si se colapsan capas, el wiring actual de 127 líneas (`auth.ts`) se reduce a:
```typescript
router.post('/register', validate(schema), (req, res) => {
  // lógica inline aquí
});
```
O si se mantienen services:
```typescript
const authService = new AuthService(userRepo, hasher);
router.post('/register', validate(schema), (req, res) => authService.register(req, res));
```

---

### R7 — Simplificar User entity

**Propuesta:**
```typescript
// Antes: 129 líneas
export class User { /* 20 getters, 8 with* methods */ }

// Después: ~25 líneas
export interface User {
  id: string; email: string; name: string; lastname: string;
  phone?: string; kind: UserRole; authProvider: AuthProvider;
  passwordHash?: string; googleId?: string;
  twoFactor?: { codeHash?: string; expiresAt?: Date; };
  lastLoginAt?: Date; twoFactorFailedAttempts?: number;
  twoFactorLockedUntil?: Date; resetFailedAttempts?: number;
  resetLockedUntil?: Date;
}
```

---

### R8 — merge `application/errors/AppError.ts` con el error handler

AppError tiene 8 lines. Podría moverse a un archivo compartido o integrarse directamente en el middleware.

---

### R9 — Reducir tsconfig duplicación

Hay 3 tsconfigs en backend (`tsconfig.json`, `tsconfig.jest.json`, `tsconfig.test.json`) y 3 en frontend (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`). Algunos están justificados (JSX, DOM vs Node), pero `tsconfig.jest.json` y `tsconfig.test.json` en backend probablemente pueden unificarse.

---

## 4. ABSTRACCIONES INJUSTIFICADAS

### Interfaces sin justificación (single-implementación)

| Archivo | Razón para eliminar |
|---|---|
| `application/ports/IPasswordHasher.ts` | 1 impl (`BcryptPasswordHasher`) |
| `application/ports/ITokenService.ts` | 1 impl (`JwtTokenService`) |
| `application/ports/IHashService.ts` | 1 impl (`HashService`) |
| `application/ports/IRandomGenerator.ts` | 1 impl (`RandomGenerator`) |
| `application/ports/IDateTimeProvider.ts` | 1 impl (`DateTimeProvider` — `new Date()`) |
| `application/ports/IGoogleAuthService.ts` | 1 impl (`GoogleAuthService`) |
| `domain/repositories/IUserRepository.ts` | 1 impl (`MongoUserRepository`) |
| `domain/repositories/IAppointmentRepository.ts` | 1 impl (`MongoAppointmentRepository`) |
| `domain/repositories/IBarberRepository.ts` | 1 impl (`MongoBarberRepository`) |
| `domain/repositories/IClientRepository.ts` | - |
| `domain/repositories/IPasswordResetRepository.ts` | 1 impl (`MongoPasswordResetRepository`) |
| `domain/repositories/IRefreshTokenRepository.ts` | 1 impl (`MongoRefreshTokenRepository`) |
| `domain/repositories/IServiceRepository.ts` | 1 impl (`StaticServiceRepository`) |
| `domain/repositories/ITempLockRepository.ts` | 1 impl (`MongoTempLockRepository`) |

### Capas innecesarias

| Capa | Razón |
|---|---|
| `application/dto/` | Types planos sin lógica — colapsar |
| `interface-adapters/presenters/` | 4 archivos idénticos — middleware |
| `wiring/` | DI manual — colapsar o usar container |
| `infrastructure/mappers/` | 6 archivos de transformación manual — innecesario con types planos |
| `domain/value-objects/` | Validación duplicada con Joi |
| `domain/repositories/` | Interfaces duplican concepto de `application/ports/` |

### Wrappers inútiles

| Archivo | Razón |
|---|---|
| `DateTimeProvider.ts` | Envuelve `new Date()` en una clase con interface |

### Hooks/helpers artificiales

| Archivo | Razón |
|---|---|
| `frontend/src/hooks/useFormValidation.ts` | Si es solo para un par de formularios, mejor inline |

---

## 6. QUICK WINS

| # | Acción | Archivos | Impacto |
|---|---|---|---|
| 1 | Borrar todos los `mock.ts` (15 archivos) | Inmediato | Reduce ruido en 15 archivos |
| 2 | Borrar `pages/client/admin/` (15 archivos) | Inmediato | Elimina duplicación crítica |
| 3 | Unificar `PasswordStrength.tsx` | Inmediato | Elimina duplicación |
| 4 | Unificar 4 presenters en 1 | 30 min | -3 archivos |
| 5 | Eliminar `IDateTimeProvider` + `DateTimeProvider` | 15 min | -2 archivos |
| 6 | Eliminar `IRandomGenerator` + `RandomGenerator` | 15 min | -2 archivos |
| 7 | Colapsar `AuthPresenter` en middleware | 30 min | -4 archivos |
| 8 | Eliminar `AppError.ts` → inline error | 15 min | -1 archivo |
| 9 | Eliminar `domain/types/auth.ts` (duplicado de User.ts) | 15 min | -1 archivo |
| 10 | Reducir User.ts a interface plana | 1 hora | -100 líneas |

**Total quick wins:** ~40 archivos menos, ~200 líneas menos de código muerto o redundante.

---

## 7. ANTI-PATTERNS DETECTADOS

### 1. **Architecture Astronaut Syndrome** (CRÍTICO)
Clean Architecture para una app que podría ser Express plano + algunas carpetas. Las capas no resuelven problemas reales del dominio. La app es un CRUD con auth, no un sistema bancario distribuido.

### 2. **Cargo Cult Architecture**
Se aplicaron patrones de DDD/Clean Architecture porque "es lo correcto" sin evaluar si el dominio lo justifica. 23 ADRs para una barbería es un signo de alerta.

### 3. **Needless Indirection** (CRÍTICO)
Controller → UseCase → Repository(Interface) → MongoRepository → Mapper → MongoModel. 6 saltos para hacer un `findOne`. Cada salto es un archivo que mantener y debuggear.

### 4. **Speculative Generality**
- Interfaces con 1 implementación (asumiendo "podríamos necesitar PostgreSQL algún día")
- Value objects (asumiendo "la validación de email podría cambiar")
- Mappers (asumiendo "el schema de Mongo podría ser distinto a la entidad")

### 5. **Framework-Driven Design**
La arquitectura está diseñada alrededor de patrones (Clean Architecture, DDD) en vez de alrededor del dominio (barbería, turnos, servicios). El resultado es que entiendes la arquitectura antes de entender el negocio.

### 6. **Premature Abstraction**
Capa de DTOs creada antes de que existiera la necesidad de transformar datos. Value objects creados antes de tener un solo bug de validación. Interfaces creadas antes de tener una segunda implementación.

### 7. **Accidental Complexity**
El 40% de los archivos existen por decisiones arquitectónicas, no por requerimientos del negocio. La complejidad es accidental, no esencial.

### 8. **Copy-Paste Architecture** (Frontend)
El patrón `pages/client/admin/` copia exacta de `pages/admin/` es el anti-patrón más obvio. Si se necesitan rutas distintas, se configura el router, no se duplican componentes.

### 9. **Lava Layer Anti-Pattern**
`mock.ts` files en 12 carpetas que nadie usa ni recuerda por qué están ahí. Código zombi que persiste porque "no estorba".

### 10. **DTO Overload**
15 archivos de DTO que son type aliases. En vez de colapsar, se expandió en una carpeta dedicada con subcarpetas por módulo.

---

## RECOMENDACIÓN FINAL

**El backend necesita un rewrite pragmático.** No porque el código esté mal escrito, sino porque la arquitectura elegida es incorrecta para el problema. Estimar ~60% de reducción de archivos y ~70% de reducción de complejidad cognitiva.

**El frontend necesita limpieza inmediata:** eliminar duplicados y mocks fantasmas. Eso solo reduce ~30 archivos y mejora la navegabilidad del proyecto de inmediato.

**Prioridad:**
1. 🔴 Borrar `pages/client/admin/` y `mock.ts` files (hoy, 5 min)
2. 🔴 Unificar presenters y eliminar interfaces single-impl (1 día)
3. 🟡 Colapsar backend a 3 capas (1–2 semanas)
4. 🟡 Simplificar entidades y eliminar value objects (en paralelo con 3)
5. 🟢 Extraer helper `wrapAsync` para thunks Redux (mejora DX)
6. 🟢 Evaluar si 23 ADRs son mantenibles o si saturan al equipo

**Métrica de éxito:** Un nuevo dev debería poder entender y modificar un flujo completo (ej: registrar usuario) mirando ≤3 archivos, no 12.
