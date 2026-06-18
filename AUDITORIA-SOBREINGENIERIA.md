# Auditoría de Sobreingeniería — Sistema de Gestión de Turnos (Barbería)

> **Fecha:** 2026-06-17
> **Alcance:** Backend (146 archivos TS), Frontend (128 archivos TS/TSX), OpenAPI, Documentación C4
> **Propósito:** Determinar si la complejidad técnica está justificada por las necesidades reales del negocio

---

## Resumen Ejecutivo

| Métrica | Puntuación | Interpretación |
|---|---|---|
| **Sobreingeniería** | **8/10** | La arquitectura está significativamente sobredimensionada para el dominio del problema |
| **Complejidad accidental** | **7/10** | Gran parte de la complejidad proviene de decisiones arquitectónicas, no del negocio |
| **Alineación con negocio** | **4/10** | La forma no sigue a la función; la arquitectura dicta la estructura en lugar de adaptarse |
| **Riesgo de mantenimiento** | **7/10** | Alta fricción para cambios simples, curva de aprendizaje elevada |

### Veredicto

Este sistema presenta un **caso de estudio clásico de sobreingeniería inducida por aplicación dogmática de Clean Architecture**. El dominio de negocio es una barbería con gestión de turnos — un problema resoluble con ~30-40 archivos backend bien organizados. En su lugar, encontramos **146 archivos backend** organizados en 7 capas + wiring, con abstracciones en cascada que multiplican la complejidad sin aportar valor proporcional.

> **Si esta empresa tuviera que duplicar la velocidad de entrega de funcionalidades mañana, esta arquitectura sería un obstáculo significativo.**

---

## 1. Alineación Arquitectura ↔ Negocio

### El negocio real

- Una barbería con 1-10 barberos
- Clientes reservan turnos (anónimos o registrados)
- Admin gestiona barberos, horarios, turnos
- Autenticación con email/password o Google
- 2FA obligatorio por email
- Sin pagos online reales, sin integraciones third-party, sin colas, sin eventos

### La arquitectura actual

- **Clean Architecture completa** con 4 capas + wiring
- **28 casos de uso** para un dominio con ~6 operaciones de negocio distintas
- **8 interfaces de repositorio** con implementaciones 1:1
- **7 puertos de aplicación** (incluyendo `IDateTimeProvider` para `new Date()`)
- **6 mappers** para convertir entre estructuras casi idénticas
- **Value Objects** para `Price` y `DurationMinutes` (wrapper de `number`)
- **4 Presenters** que son copia exacta el uno del otro

### Violaciones YAGNI identificadas

| # | Violación | Evidencia | Impacto |
|---|---|---|---|
| 1 | `IDateTimeProvider` | Interfaz de 1 método: `now(): Date`. Implementación: `return new Date()` | Medio |
| 2 | `IRandomGenerator` | Interfaz para `crypto.randomInt()` y `crypto.randomBytes()` | Medio |
| 3 | `Price` y `DurationMinutes` como Value Objects | Wrappers de `number` con validación `> 0`. Misma validación que hace Joi en la capa de entrada | Medio |
| 4 | 4 Presenters idénticos | Mismo código en 4 archivos. Podría ser 1 utility function | Bajo |
| 5 | `GetCurrentUserUseCase` | 15 líneas, 2 líneas de lógica: `findById()` → return | Alto |
| 6 | `GetAllServicesUseCase` | 22 líneas, 3 líneas de lógica: `findAll()` → map a DTO | Alto |
| 7 | `ReleaseTempLockUseCase` | 13 líneas, 3 líneas de lógica | Alto |
| 8 | `GetAppointmentsAnonymousUseCase` | Pasamanos puro | Alto |
| 9 | `GetBarberScheduleUseCase` | Pasamanos puro | Alto |

### Architecture Astronaut Syndrome

El sistema presenta múltiples síntomas de "astronauta de la arquitectura":

> **Síntoma:** Interfaces que existen solo porque Clean Architecture dice que debe haber interfaces, no porque haya múltiples implementaciones o una razón técnica para el desacoplamiento.

- `IAppointmentRepository` → 1 implementación (`MongoAppointmentRepository`)
- `IBarberRepository` → 1 implementación (`MongoBarberRepository`)
- `IUserRepository` → 1 implementación (`MongoUserRepository`)
- `ITokenService` → 1 implementación (`JwtTokenService`)
- `IPasswordHasher` → 1 implementación (`BcryptPasswordHasher`)
- `IDateTimeProvider` → 1 implementación (`DateTimeProvider`)
- `IRandomGenerator` → 1 implementación (`RandomGenerator`)
- `IHashService` → 1 implementación (`HashService`)

La única interfaz con 2 implementaciones es `IEmailService` (NodemailerEmailService + FakeEmailService), y la única con justificación real. Las demás son **abstracciones que abstraen nada**.

---

## 2. Detección de Sobreingeniería

### 2.1 Capas innecesarias

**Flujo actual de una request típica:**

```
Route → ValidationMiddleware → Controller → UseCase → Repository Interface → Repository Implementation → Mapper → Mongoose Model → MongoDB
         ↑                                                                                                              ↑
         AuthMiddleware                                                                                          Response
```

**Capas que sobran:**

| Capa | ¿Aporta valor? | Análisis |
|---|---|---|
| **UseCase** | Algunos sí | ~10 de 28 tienen lógica real. Los otros son pasamanos |
| **Presenter** | No | 4 archivos idénticos que hacen `res.status().json()`. Un helper `sendResponse(res, data, status, error)` basta |
| **Mapper** | Marginal | Convierte entre doc Mongoose y entidad de dominio que tienen los mismos campos. Si el dominio usara tipos simples, no haría falta |
| **Repository Interface** | Bajo | 7 de 8 interfaces tienen 1 sola implementación. Añaden indirección sin beneficio |
| **Value Object (Price, DurationMinutes)** | No | Validación trivial que ya ocurre en Joi |
| **Wiring** | Medio | DI manual sin contenedor. Es verbose pero evita magia. Coste/beneficio aceptable |

### 2.2 Abstracciones innecesarias

#### Interfaces con una única implementación (7/8)

```typescript
// Contrato: 3 líneas
export interface IDateTimeProvider {
  now(): Date;
}

// Implementación: 7 líneas
export class DateTimeProvider implements IDateTimeProvider {
  now(): Date {
    return new Date();  // ← Esto es todo
  }
}

// Uso en un Use Case (ej: VerifyTwoFactorUseCase)
constructor(
  ...,
  private readonly dateTimeProvider: IDateTimeProvider  // ← 6 imports adicionales
)
```

**Coste:** 1 interfaz + 1 implementación + 1 import + 1 parámetro en constructor + 1 binding en wiring.
**Valor real:** Cero. `new Date()` es nativo de JavaScript, no necesita ser mockeable porque `jest.useFakeTimers()` ya lo hace sin interfaces.

#### Factories sin variantes reales

- `createAuthenticate(tokenService)` — siempre se llama con `JwtTokenService`. Podría ser una función directa.
- `createOptionalAuth(tokenService)` — idem.

#### DTOs redundantes

```typescript
// application/dto/service/ServiceResponseDTO.ts
export type ServiceResponseDTO = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
};
```

Esto es idéntico a `Service.toPrimitives()`. Y el mapper hace el viaje de vuelta. Son 3 representaciones de lo mismo.

### 2.3 Boilerplate excesivo

#### El caso `Appointment.ts` (299 líneas)

La entidad `Appointment` contiene:
- `AppointmentCreateProps` type (24 campos)
- `AppointmentPrimitives` type (24 campos, idéntico)
- `AppointmentData` type (24 campos, con Value Objects)
- Clase con 24 getters (1 por campo)
- 5 métodos de negocio (cancel, pay, complete, markNoShow, addStatusHistoryEntry)
- Método `toPrimitives()` (24 líneas de mapping manual)
- Método estático `create()` (24 líneas de asignación)

**Cálculo de ratio:** ~60% del archivo es boilerplate de mapeo/getters. Solo ~40% es lógica de negocio real.

#### 4 Presenters idénticos

```typescript
// AppointmentPresenter.ts, AuthPresenter.ts, BarberPresenter.ts, ServicePresenter.ts
// Son todos:
class XxxPresenter {
  static success<T>(res: Response, payload: T, status = 200) {
    return res.status(status).json(payload);
  }
  static handleError(res: Response, error: unknown, fallbackMessage: string) {
    if (error instanceof AppError) return res.status(error.statusCode).json({ error: error.message });
    return res.status(500).json({ error: fallbackMessage });
  }
}
```

4 archivos × 16 líneas = 64 líneas de código duplicado. Una sola función `sendResponse()` bastaría.

### 2.4 Frontend: Dualidad de servicios

El frontend tiene **dos sistemas paralelos** para llamar a la API:

1. **Servicios manuales** (`appointment.service.ts`, `auth.service.ts`, `professional.service.ts`) — Axios calls directas
2. **RTK Query APIs** (`appointmentApi.ts`, `authApi.ts`) — Redux Toolkit Query

Ambos hacen lo mismo. Algunos componentes usan los servicios manuales, otros usan RTK Query. Esto duplica:
- Tipos de respuesta (definidos en ambos lados)
- Lógica de llamada HTTP
- Mantenimiento (cambiar un endpoint requiere actualizar 2 archivos)

---

## 3. Evaluación de Clean Architecture / Hexagonal Architecture

### ¿Está correctamente aplicada?

**Sí, la aplicación de Clean Architecture es técnicamente correcta:**
- Las dependencias apuntan hacia adentro (domain no importa infraestructura)
- Las interfaces de repositorio están en dominio
- Los puertos están en application
- Las implementaciones están en infraestructura

### ¿Está sobredimensionada?

**Sí, significativamente.** Clean Architecture es un patron para sistemas con:

1. **Múltiples fuentes de datos** (DB primaria + caché + API externa + archivos)
2. **Múltiples equipos trabajando en paralelo**
3. **Reglas de negocio complejas que cambian independientemente de la infraestructura**
4. **Necesidad de probar el dominio sin infraestructura**

Este sistema tiene:
- **1 fuente de datos** (MongoDB)
- **1 equipo** (probablemente 1-2 developers)
- **Reglas de negocio**: Validar horarios, evitar overlaps, enviar emails, 2FA. Nada que justifique 7 capas de abstracción.

### ¿El costo de la separación supera sus beneficios?

**Sí.** El costo actual:

| Costo | Evidencia |
|---|---|
| 146 archivos backend | 28 use cases, 8 repositories, 8 interfaces, 6 mappers, 7 ports, 5 VOs, 7 entities, 6 wiring |
| 6 archivos de wiring | Cada uno con 10-30 líneas de `new Xxx()` manual |
| Curva de aprendizaje | Un nuevo developer necesita entender Clean Architecture + 7 capas + wiring manual para agregar un endpoint |
| Tiempo para feature simple | Agregar `GET /api/barbers/:id/stats` requeriría: DTO → Interface → UseCase → Controller → Route → Wiring → Test |

**Beneficio real:** Testabilidad del dominio (parcial) + separación de concerns.

### Pregunta clave: ¿Qué problema real resuelve esta separación?

| Capa | Problema que resuelve | ¿Justificado? |
|---|---|---|
| Domain Entities + Services | Reglas de negocio puras (máquina de estados, validación de slots) | Sí |
| Repository Interfaces | Poder cambiar de MongoDB a PostgreSQL | No (MongoDB es elección definitiva) |
| Application Use Cases | Orquestación de operaciones | Parcialmente (~10 sí, ~18 no) |
| Application Ports | Abstraer servicios externos (email, JWT, auth) | Sí para email y JWT. No para DateTimeProvider y RandomGenerator |
| Presenters | Abstraer formato de respuesta HTTP | No (Express ya hace esto) |
| Mappers | Separar dominio de persistencia | No (domino y persistencia tienen mismos campos) |
| Wiring | Ensamblar dependencias | Sí (alternativa aceptable a IoC container) |

---

## 4. Complejidad Accidental vs Necesaria

### Complejidad necesaria (surge del negocio)

| Elemento | Justificación |
|---|---|
| Flujo 2FA (send → verify) | Seguridad real, login en 2 pasos |
| TempLock + TTL index | Previene race conditions en reserva |
| Máquina de estados de Appointment | Regla de negocio real (Confirmado → Completado/Cancelado/NoShow) |
| SlotService | Cálculo de disponibilidad con horarios, breaks, ocupación |
| Anti brute-force (lockout 2FA y reset) | Seguridad necesaria |
| Refresh token rotation | Protección contra robo de tokens |
| Rate limiting por ruta | Protección contra abusos |
| Unique compound index | Barrera doble contra double-booking |

### Complejidad accidental (surge de decisiones técnicas)

| Elemento | Coste | Simplificación |
|---|---|---|
| 28 Use Cases (solo ~10 con lógica real) | 18 archivos adicionales | Fusionar pasamanos con controllers |
| 5 Value Objects (Price, DurationMinutes, etc.) | 5 archivos + 30 imports | Tipos simples o branded types |
| 4 Presenters idénticos | 4 archivos duplicados | 1 función helper |
| IDateTimeProvider | 2 archivos + wiring | `new Date()` directo |
| IRandomGenerator | 2 archivos + wiring | `crypto.randomInt()` directo |
| 6 Mappers (copia de campos) | 6 archivos | Usar tipos del documento directamente |
| 8 interfaces de repositorio (7 single-impl) | 8 archivos extra | Eliminar interfaces, usar implementaciones directas |
| Frontend dual (service + RTK Query) | 10+ archivos duplicados | Elegir UNO (RTK Query recomendado) |
| 3 tipos idénticos en Appointment (Props, Primitives, Data) | ~100 líneas de boilerplate | 1 tipo + omit/partial |

### Ratio general

| Tipo | Archivos | % |
|---|---|---|
| Complejidad necesaria | ~50 | ~35% |
| Complejidad accidental | ~96 | ~65% |

**El 65% de los archivos backend existen por decisiones arquitectónicas, no por requisitos del negocio.**

---

## 5. Escalabilidad Real vs Imaginaria

### Escalabilidad real (problemas plausibles)

| Problema | Probabilidad | ¿Abordado? |
|---|---|---|
| 100 clientes simultáneos reservando | Alta | Parcial (índices únicos, rate limiting) |
| 1-5 barberos operando | Alta | Sí (modelo de datos lo soporta) |
| Pico de 50 reservas/hora | Alta | Sí (índices, sin transacciones pesadas) |
| Un developer nuevo entiende el código | Alta | **No** (curva pronunciada) |
| Agregar "cancelación con cargo" | Media | **No** (requiere cambios en 5+ capas) |

### Escalabilidad imaginaria (soluciones anticipadas)

| Solución | Problema hipotético | Estado real |
|---|---|---|
| Clean Architecture completa | "Vamos a cambiar de MongoDB a PostgreSQL" | No va a pasar |
| 28 Use Cases separados | "Cada operación tendrá lógica única compleja" | 18 son CRUD puro |
| 7 puertos de aplicación | "Vamos a reemplazar JWT, bcrypt, crypto, nodemailer, todo" | No va a pasar |
| IDateTimeProvider | "Vamos a cambiar `new Date()` por algo más" | No va a pasar |
| 6 mappers | "La entidad de dominio y el documento MongoDB divergirán" | Son idénticos hoy |
| IRandomGenerator | "Vamos a cambiar crypto.randomInt por otra lib" | No va a pasar |

---

## 6. Coste de Mantenimiento

### Curva de aprendizaje

Para que un nuevo developer implemente `GET /api/barbers/:id/stats` (contar turnos completados), necesita entender:

1. **Domain layer**: Entities (7), Types (2), Value Objects (5), Repository Interfaces (8)
2. **Application layer**: DTOs (16), Ports (7), Errors (1), Use Cases (28)
3. **Infrastructure layer**: Models (6), Mappers (6), Repositories (8), Services (8), Config (4)
4. **Interface Adapters**: Controllers (9), Presenters (4), Middlewares (2), Routes (6), Validators (4)
5. **Wiring**: 6 archivos con DI manual
6. **Clean Architecture** en sí misma (inversión de dependencias, reglas de capas)

**Tiempo estimado para una feature trivial (CRUD read):**
- Sin Clean Architecture: ~30 minutos
- Con esta arquitectura: ~2-4 horas (crear DTO, UseCase, Controller, test, wiring, etc.)

### Archivos para entender UN flujo

**Flujo: Crear un turno**

| # | Archivo | Capa |
|---|---|---|
| 1 | `BarberController.ts` | Interface Adapters |
| 2 | `CreateAppointmentUseCase.ts` | Application |
| 3 | `CreateAppointmentDTO.ts` | Application |
| 4 | `AppointmentResponseDTO.ts` | Application |
| 5 | `IAppointmentRepository.ts` | Domain |
| 6 | `IBarberRepository.ts` | Domain |
| 7 | `IClientRepository.ts` | Domain |
| 8 | `IServiceRepository.ts` | Domain |
| 9 | `ITempLockRepository.ts` | Domain |
| 10 | `IEmailService.ts` | Application Ports |
| 11 | `Appointment.ts` (entity) | Domain |
| 12 | `Email.ts` (VO) | Domain |
| 13 | `Phone.ts` (VO) | Domain |
| 14 | `Price.ts` (VO) | Domain |
| 15 | `DurationMinutes.ts` (VO) | Domain |
| 16 | `SlotService.ts` | Domain |
| 17 | `time.ts` (utils) | Domain |
| 18 | `AppointmentMapper.ts` | Infrastructure |
| 19 | `MongoAppointmentRepository.ts` | Infrastructure |
| 20 | `appointment.model.ts` | Infrastructure |
| 21 | `AppointmentPresenter.ts` | Interface Adapters |
| 22 | `appointment.validator.ts` | Interface Adapters |
| 23 | `auth.middleware.ts` | Interface Adapters |
| 24 | `appointment.routes.ts` | Interface Adapters |
| 25 | `wiring/appointment.ts` | Wiring |

**25 archivos** para entender un flujo que en esencia es: validar datos → guardar en MongoDB → responder.

### Riesgo de introducir bugs

Cada capa adicional es un punto de fallo potencial:
- **DTO mal tipado** → error runtime
- **Mapper desincronizado** → campo faltante en respuesta
- **Wiring mal configurado** → dependencia undefined
- **Interface no coincide con implementación** → error de tipo
- **Presenter con lógica extra** → respuesta inconsistente

---

## 7. Señales de Código Generado por IA

| Señal | Evidencia | Nivel de sospecha |
|---|---|---|
| Consistencia extrema entre archivos | Los 28 use cases siguen exactamente el mismo patrón (class + constructor + execute). Los 4 presenters son idénticos | **Alto** |
| Multiplicación innecesaria de archivos | 28 use cases donde ~18 son CRUD pass-through. Cada uno en su propio archivo | **Alto** |
| Abstracciones perfectas pero inútiles | IDateTimeProvider, IRandomGenerator, Price VO, DurationMinutes VO | **Alto** |
| Estructura de carpetas sobreingenierizada | domain/entities/ + domain/value-objects/ + domain/services/ + domain/repositories/ + domain/types/ + domain/utils/ + domain/constants/ | **Alto** |
| Nombres genéricos de capas | `application/dto/`, `application/ports/`, `application/errors/` | **Medio** |
| Separación excesiva de responsabilidades | Cada tipo en su propio archivo (Email.ts, Phone.ts, Price.ts, DurationMinutes.ts, Password.ts como VOs separados) | **Alto** |
| Patrón clase + método único en cada archivo | 28 use cases, 8 repositories, 7 services, 6 mappers, todos siguen exactamente el mismo molde | **Alto** |

**Veredicto de sospecha: ALTO.** La estructura sugiere que una porción significativa del código fue generada por IA siguiendo un prompt tipo "genera un backend con Clean Architecture completo para un sistema de turnos de barbería".

---

## Hallazgos Críticos

| # | Hallazgo | Impacto | Severidad | Evidencia |
|---|---|---|---|---|
| H1 | **28 Use Cases, ~18 innecesarios** | Alta fricción para cambios + 2,847 líneas de boilerplate | Crítica | `src/application/use-cases/` contiene casos como `GetCurrentUserUseCase` (15 líneas, 2 de lógica) |
| H2 | **IDateTimeProvider y IRandomGenerator** | 4 archivos + wiring para wrap de funciones nativas de JS | Alta | `IDateTimeProvider.ts` (3 líneas), `DateTimeProvider.ts` (7 líneas, `return new Date()`) |
| H3 | **4 Presenters idénticos** | 64 líneas de código duplicado. Cada nuevo controller requiere otro | Alta | `AuthPresenter`, `BarberPresenter`, `AppointmentPresenter`, `ServicePresenter` son iguales |
| H4 | **Appointment.ts: 299 líneas (60% boilerplate)** | Getters para 24 campos + 2 tipos duplicados + mapping manual | Alta | El mismo campo se escribe en `AppointmentCreateProps`, `AppointmentPrimitives`, `AppointmentData` y `toPrimitives()` |
| H5 | **Frontend dual: service + RTK Query** | 10+ archivos paralelos para misma funcionalidad | Alta | `appointment.service.ts` y `appointmentApi.ts` coexisten. Ídem para auth |
| H6 | **6 Mappers para estructuras casi idénticas** | 6 archivos que copian campo por campo entre doc y entity | Media | `AppointmentMapper.fromDocument()` replica todos los campos uno a uno |
| H7 | **5 Value Objects de los que 2 son triviales** | `Price` y `DurationMinutes` solo validan `> 0` | Media | Podrían ser `branded types`: `type Price = number & { __brand: 'Price' }` |
| H8 | **7 interfaces repositorio con 1 implementación** | 7 archivos de interfaz que añaden indirección sin beneficio | Media | Solo `IEmailService` tiene 2 implementaciones |
| H9 | **Sin transacciones MongoDB** + email fire-and-forget | Riesgo de datos inconsistentes | Alta | CreateAppointmentUseCase crea turno, borra tempLock, envía email. Sin atomicidad |
| H10 | **Race condition en tempLock → appointment** | Dos usuarios pueden crear tempLock, solo uno crea turno, el tempLock queda huérfano (TTL rescue) | Media | `MongoAppointmentRepository.ts` no usa transacciones |

---

## Componentes que Aportan Valor

| Componente | Razón |
|---|---|
| **SlotService** | Lógica de dominio real: cálculo de slots disponibles con horarios, breaks, ocupación. Bien encapsulado |
| **Appointment state machine** | `VALID_TRANSITIONS`, `cancel()`, `complete()`, `markNoShow()` en `Appointment.ts` |
| **2FA flow** | `SendTwoFactorCodeUseCase` + `VerifyTwoFactorUseCase` con anti-brute-force, constant-time compare |
| **Refresh token rotation + theft detection** | Seguridad real contra robo de tokens |
| **Rate limiting por ruta** | 7 limiters con límites diferenciados |
| **TempLock + TTL index** | Solución pragmática a race conditions en reserva |
| **Unique compound indexes** | Doble barrera contra double-booking |
| **Auth middleware factories** | `createAuthenticate`, `authorize`, `authorizeSelfOrKinds`, `createOptionalAuth` bien diseñados |
| **Wiring manual (vs DI container)** | Dependencias explícitas y rastreables |
| **AppError** | Manejo de errores consistente con status code |

---

## Componentes Sospechosos de Sobreingeniería

### IDateTimeProvider (Alta prioridad)

- **Qué hace:** Envuelve `new Date()` en una interfaz
- **Por qué es excesivo:** JavaScript tiene `Date` nativo. Jest ya permite mockear tiempo con `jest.useFakeTimers()`. No hay ningún escenario donde necesites reemplazar `new Date()` por otra implementación.
- **Coste:** 1 interfaz + 1 clase + 1 import en cada use case + 1 parámetro en constructor + 1 binding en wiring
- **Simplificación:** Eliminar la interfaz y la clase. Usar `new Date()` directamente. Si necesitas testear, usa `jest.useFakeTimers()`.

### IRandomGenerator (Alta prioridad)

- **Qué hace:** Envuelve `crypto.randomInt()` y `crypto.randomBytes()`
- **Por qué es excesivo:** crypto es nativo de Node.js. No hay sustituto real. La probabilidad de cambiar de librería de randomness es ~0%.
- **Coste:** 1 interfaz + 1 clase + imports + wiring
- **Simplificación:** Usar `crypto.randomInt()` y `crypto.randomBytes()` directamente.

### Price y DurationMinutes (Media prioridad)

- **Qué hace:** `Price.create(n)` valida que n > 0. `DurationMinutes.create(n)` igual.
- **Por qué es excesivo:** La validación ya ocurre en Joi (capa de entrada) y en el modelo de Mongoose. Crear una clase entera con getter para esto es desproporcionado.
- **Coste:** 2 archivos + imports en Appointment.ts (donde se mapean en create y se unwrap en toPrimitives)
- **Simplificación:** `type Price = number` o branded type.

### 4 Presenters (Media prioridad)

- **Qué hace:** 4 clases estáticas idénticas que devuelven `res.status().json()`
- **Por qué es excesivo:** Son exactamente iguales. No hay personalización por tipo de recurso.
- **Coste:** 4 archivos × 16 líneas = 64 líneas duplicadas. Si cambia el formato de error, hay que tocar 4 archivos.
- **Simplificación:** Una función `sendResponse(res, data, status?)` y `sendError(res, error, fallback)`.

### Appointment.ts - Triple tipo duplicado (Media prioridad)

- **Qué hace:** Define 3 tipos casi idénticos (AppointmentCreateProps, AppointmentPrimitives, AppointmentData) + clase con 24 getters
- **Por qué es excesivo:** `AppointmentCreateProps` y `AppointmentPrimitives` son el mismo tipo. `AppointmentData` solo cambia algunos campos a Value Objects. Los getters añaden 60 líneas para no hacer nada (son todas públicas).
- **Coste:** ~180 líneas de boilerplate por entidad. Proporcionalmente peor en entidades pequeñas como Service.
- **Simplificación:** Un solo tipo `AppointmentProps`, hacer los campos readonly, eliminar clase si no hay lógica de negocio adicional.

### GetAllServicesUseCase (Alta prioridad)

- **Qué hace:** `serviceRepository.findAll()` → map a DTO → return
- **Coste:** Archivo de 22 líneas + test + wiring
- **Simplificación:** Eliminar el use case. El controller puede llamar al repositorio directamente.

### GetCurrentUserUseCase (Alta prioridad)

- **Qué hace:** `userRepository.findById(id)` → throw if null → return user
- **Coste:** Archivo de 15 líneas + test + wiring
- **Simplificación:** Un middleware de Express que adjunte req.user con datos completos.

### GetAppointmentsAnonymousUseCase (Alta prioridad)

- **Qué hace:** `appointmentRepository.findByContactAndDate()` → return
- **Coste:** Archivo trivial + test + wiring
- **Simplificación:** Eliminar use case.

---

## Archivos Pasamanos Detectados

| Archivo | Función real | Mantener | Fusionar | Eliminar |
|---|---|---|---|---|
| `application/ports/IDateTimeProvider.ts` | Interfaz `now(): Date` | ✗ | ✗ | ✓ |
| `infrastructure/services/DateTimeProvider.ts` | `return new Date()` | ✗ | ✗ | ✓ |
| `application/ports/IRandomGenerator.ts` | Interfaz random | ✗ | ✗ | ✓ |
| `infrastructure/services/RandomGenerator.ts` | Wrapper de crypto | ✗ | ✗ | ✓ |
| `domain/value-objects/Price.ts` | `number > 0` | ✗ | Con `DurationMinutes` | ✓ |
| `domain/value-objects/DurationMinutes.ts` | `number > 0` | ✗ | Con `Price` | ✓ |
| `interface-adapters/presenters/AuthPresenter.ts` | `res.status().json()` | ✗ | Un solo helper | ✓ |
| `interface-adapters/presenters/BarberPresenter.ts` | `res.status().json()` | ✗ | Un solo helper | ✓ |
| `interface-adapters/presenters/AppointmentPresenter.ts` | `res.status().json()` | ✗ | Un solo helper | ✓ |
| `interface-adapters/presenters/ServicePresenter.ts` | `res.status().json()` | ✗ | Un solo helper | ✓ |
| `application/use-cases/service/GetAllServicesUseCase.ts` | Pasamanos CRUD | ✗ | En Controller | ✓ |
| `application/use-cases/user/GetCurrentUserUseCase.ts` | `findById` puro | ✗ | En Controller | ✓ |
| `application/use-cases/tempLock/CreateTempLockUseCase.ts` | 3 líneas de lógica | ✓ (valor marginal) | Simplificar | ✗ |
| `application/use-cases/tempLock/ReleaseTempLockUseCase.ts` | 3 líneas de lógica | ✗ | En Controller | ✓ |
| `application/use-cases/appointment/GetAppointmentsAnonymousUseCase.ts` | Pasamanos CRUD | ✗ | En Controller | ✓ |
| `application/use-cases/barber/GetAllBarbersUseCase.ts` | Pasamanos CRUD | ✗ | En Controller | ✓ |
| `application/use-cases/barber/GetBarberByIdUseCase.ts` | Pasamanos CRUD | ✗ | En Controller | ✓ |
| `application/use-cases/barber/GetBarberScheduleUseCase.ts` | Pasamanos CRUD | ✗ | En Controller | ✓ |
| `infrastructure/mappers/ServiceMapper.ts` | Copia campos | ✗ | ✗ | ✓ |
| `infrastructure/mappers/PasswordResetMapper.ts` | Copia campos | ✗ | ✗ | ✓ |
| `infrastructure/mappers/UserMapper.ts` | Copia campos | ✗ | ✗ | ✓ |
| `infrastructure/mappers/ClientMapper.ts` | Copia campos | ✗ | ✗ | ✓ |
| `infrastructure/repositories/static/StaticServiceRepository.ts` | Array en memoria | ✓ | Sin interfaz | Simplificar |
| `domain/constants/validation.ts` | `EMAIL_REGEX` | ✓ | En validator | ✓ (fusionar con validators) |
| `domain/repositories/IClientRepository.ts` | 1 implementación | ✗ | ✗ | ✓ |
| `domain/repositories/IPasswordResetRepository.ts` | 1 implementación | ✗ | ✗ | ✓ |
| `domain/repositories/IRefreshTokenRepository.ts` | 1 implementación | ✗ | ✗ | ✓ |
| `domain/repositories/ITempLockRepository.ts` | 1 implementación | ✗ | ✗ | ✓ |
| `domain/repositories/IServiceRepository.ts` | 1 implementación | ✗ | ✗ | ✓ |

---

## Propuesta de Simplificación

### Quick Wins (bajo riesgo, alto beneficio)

| # | Cambio | Impacto |
|---|---|---|
| 1 | **Eliminar IDateTimeProvider** → usar `new Date()` directamente | -2 archivos, -1 interfaz, -wiring |
| 2 | **Eliminar IRandomGenerator** → usar `crypto` directamente | -2 archivos, -1 interfaz, -wiring |
| 3 | **Fusionar 4 Presenters** en un solo `responseHelper.ts` | -3 archivos, elimina duplicación |
| 4 | **Eliminar Price y DurationMinutes** → usar branded types `type Price = number` | -2 archivos, simplifica Appointment.ts |
| 5 | **Eliminar ServiceMapper, PasswordResetMapper, UserMapper, ClientMapper** → usar tipos del documento | -4 archivos |
| 6 | **Eliminar interfaces de repositorio con 1 impl** (IClientRepository, IPasswordResetRepository, IRefreshTokenRepository, ITempLockRepository) → usar implementación directamente | -4 archivos |

### Refactors Recomendados (cambio mediano)

| # | Cambio | Impacto |
|---|---|---|
| 7 | **Fusionar ~18 Use Cases pasamanos en los Controllers** | -18 archivos, elimina capa de indirección innecesaria |
| 8 | **Eliminar AppointmentCreateProps/AppointmentPrimitives duplicación** → 1 tipo base + utility types (Pick, Omit) | Simplifica Appointment.ts |
| 9 | **Eliminar capa DTO redundante** — usar primitivas del dominio directamente donde coincidan | -16 archivos (los DTO que son 1:1 con entities) |
| 10 | **Frontend: elegir entre service layer o RTK Query** (recomendado: RTK Query) y eliminar el otro | -~8 archivos de servicios manuales |
| 11 | **Simplificar wiring**: en lugar de 6 archivos independientes, usar 1-2 archivos con funciones de factory por módulo | -3 archivos |

### Simplificaciones Profundas (cambio estructural)

| # | Cambio | Impacto |
|---|---|---|
| 12 | **Aplanar la arquitectura**: Eliminar la distinción estricta entre domain/application/infrastructure. Usar estructura por módulo (auth/, appointments/, barbers/) con cada módulo conteniendo su modelo, lógica y rutas | Reduce drásticamente el número de archivos y la navegación |
| 13 | **Eliminar entidad Appointment como clase** si la lógica de negocio es principalmente validación de transiciones de estado. Reemplazar con tipo + funciones puras | De 299 líneas a ~60 |
| 14 | **Simplificar Appointment entity**: Eliminar getters redundantes, usar props públicas readonly | -~24 getters, ~60 líneas |
| 15 | **Migrar a estructura modular plana** (ej: `src/modules/appointments/` con `appointments.model.ts`, `appointments.controller.ts`, `appointments.service.ts`, `appointments.routes.ts`) | Reduce archivos a ~1/3 |

---

## Arquitectura Objetivo (Simplificada)

### Principios

1. **Estructura por feature, no por capa técnica**
2. **Si un archivo tiene < 20 líneas de lógica real, no necesita ser un archivo separado**
3. **Si una interfaz tiene 1 implementación y no hay plan de tener otra, no es una interfaz**
4. **El código debe organizarse para que un flujo completo se entienda en ≤ 5 archivos**

### Estructura propuesta

```
src/
├── app.ts                          # Express setup (rate limiters, helmet, cors)
├── index.ts                        # Entry point
├── common/
│   ├── errors.ts                   # AppError class
│   ├── response.ts                 # sendSuccess + sendError helpers
│   └── middleware.ts               # auth middleware (authenticate, authorize)
├── auth/
│   ├── auth.model.ts               # Mongoose models (User, RefreshToken, PasswordResetToken)
│   ├── auth.service.ts             # Register, GoogleLogin, 2FA, PasswordReset, Refresh
│   ├── auth.controller.ts          # Route handlers
│   ├── auth.routes.ts              # Route definitions
│   ├── auth.validator.ts           # Joi schemas
│   └── auth.test.ts
├── appointments/
│   ├── appointment.model.ts        # Mongoose model + types (state machine)
│   ├── appointment.service.ts      # Create, Cancel, Reschedule, UpdateStatus, List
│   ├── appointment.controller.ts
│   ├── appointment.routes.ts
│   ├── appointment.validator.ts
│   └── appointment.test.ts
├── barbers/
│   ├── barber.model.ts             # Mongoose model
│   ├── barber.service.ts           # CRUD + schedule + slots
│   ├── barber.controller.ts
│   ├── barber.routes.ts
│   ├── barber.validator.ts
│   └── barber.test.ts
├── services/
│   ├── services.model.ts
│   ├── services.controller.ts
│   └── services.routes.ts
├── tempLock/
│   ├── tempLock.model.ts
│   ├── tempLock.service.ts
│   └── tempLock.routes.ts
├── infrastructure/
│   ├── config/
│   │   ├── env.ts
│   │   ├── db.ts
│   │   └── mailer.ts
│   ├── services/
│   │   ├── JwtTokenService.ts
│   │   ├── BcryptPasswordHasher.ts
│   │   ├── NodemailerEmailService.ts
│   │   ├── FakeEmailService.ts
│   │   ├── GoogleAuthService.ts
│   │   └── HashService.ts
│   └── scripts/
│       └── seed.ts
├── domain/
│   └── time.ts                     # SlotService + time utilities
```

**Total estimado:** ~45 archivos (vs 146 actuales). **Reducción del 69%.**

### Lo que se mantiene

| Aspecto | Se mantiene | Por qué |
|---|---|---|
| Inversión de dependencias | Sí (servicios externos con interfaces) | Email, JWT, GoogleAuth tienen sustitutos reales |
| Testabilidad | Sí (los servicios se pueden instanciar con dependencias mock) | Sin necesidad de interfaces para cada repositorio |
| Separación por módulo | Sí (cada feature es independiente) | Organización clara sin sobreingeniería |
| Reglas de negocio | Sí (máquina de estados, validación de slots) | En domain/time.ts y en los modelos |
| Seguridad | Sí (rate limiting, 2FA, anti brute-force) | En app.ts y auth service |
| Async email notifications | Sí (fire-and-forget) | Patrón pragmático |

### Lo que se pierde

| Aspecto | ¿Es pérdida real? |
|---|---|
| Capacidad de cambiar MongoDB por PostgreSQL | No (MongoDB es elección definitiva, el dominio no ganaría nada) |
| Aislamiento total del dominio | Parcial (el dominio convive con infraestructura por módulo) |
| Arquitectura "académicamente correcta" | Sí (y es parte del problema) |

---

## Conclusión

Esta arquitectura fue diseñada como si el sistema fuera a ser mantenido por 5 equipos independientes, con 3 fuentes de datos diferentes, reglas de negocio financieras complejas, y la necesidad de cambiar de base de datos cada 6 meses. La realidad es **una barbería con turnos, clientes y barberos**.

El 65% de los archivos backend existen por decisiones arquitectónicas, no por requisitos del negocio. La sobreingeniería más flagrante está en:

1. **28 Use Cases** → se necesitan ~10
2. **8 interfaces de repositorio** → se necesita 1 (para email)
3. **7 puertos de aplicación** → se necesitan 4 (email, JWT, password hasher, Google auth)
4. **5 Value Objects** → se necesitan 2 (Email, Phone) y los otros 3 con tipos simples
5. **4 Presenters** → se necesita 1 helper
6. **6 Mappers** → se necesitan 0 (usar tipos del documento)

Si el objetivo es velocidad de entrega, claridad para nuevos developers y mantenibilidad a largo plazo, la simplificación propuesta reduciría el código base a ~1/3 manteniendo toda la funcionalidad, seguridad y testabilidad.

> **La mejor arquitectura no es la más pura académicamente, sino la que permite al equipo entregar valor con la menor fricción posible.**
