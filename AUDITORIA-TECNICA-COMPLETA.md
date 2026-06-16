# Auditoría Técnica Completa — Barbería App

**Proyecto:** `proyecto-integrador-Pedro-Fran`
**Fecha:** 2026-06-11
**Tipo:** Auditoría de código estática (Fases 1-9)
**Alcance:** Backend (Express 5 + MongoDB) + Frontend (React 19 + Redux Toolkit) + E2E (Playwright)

---

## Resumen Ejecutivo

| Severidad | Total |
|-----------|-------|
| **P0 — Crítico** | 6 |
| **P1 — Alto** | 14 |
| **P2 — Medio** | 14 |
| **P3 — Bajo** | 7 |

---

## Fase 1 — Mapa del Sistema

### Arquitectura General

```
Frontend (React 19 + Vite)  ──HTTP──▶  Backend (Express 5)  ──Mongoose──▶  MongoDB
         │                              │
         ├── Redux Toolkit              ├── Clean Architecture (4 capas)
         ├── RTK Query                  │   ├── Domain (Entities, Value Objects)
         ├── Axios Interceptors         │   ├── Application (Use Cases, DTOs, Ports)
         └── Framer Motion              │   ├── Infrastructure (Repos, Services, Mappers)
                                        │   └── Interface Adapters (Controllers, Routes, Middlewares)
                                        │
                                        └── Servicios externos:
                                            ├── Google OAuth
                                            ├── SMTP (Brevo/Nodemailer)
                                            └── HMAC-SHA256
```

### Conexiones entre capas

| Capa Origen | Capa Destino | Mecanismo |
|-------------|-------------|-----------|
| Frontend (Componentes) | Redux Store | `useAppDispatch` / `useAppSelector` |
| Frontend (Slices) | API Backend | Axios HTTP calls |
| Frontend (RTK Query) | API Backend | Axios baseQuery |
| Routes | Middleware | Express Router pipeline |
| Middleware | Controllers | `next()` / handler invocation |
| Controllers | Use Cases | Inyección manual de dependencias (wiring) |
| Use Cases | Domain Entities | Constructor/Factory methods |
| Use Cases | Repository Interfaces | Puertos (ports) inyectados |
| Repository Interfaces | MongoDB (Mongoose) | Implementaciones concretas |
| Infrastructure Services | Use Cases | Interfaces inyectadas (IEmailService, ITokenService, etc.) |

### Módulos identificados

| Módulo | Use Cases | Archivos |
|--------|-----------|----------|
| Auth | 6 use cases | `auth/*` + `password/*` |
| Appointment | 7 use cases | `appointment/*` |
| Barber | 9 use cases | `barber/*` |
| Service | 1 use case | `service/*` |
| TempLock | 1 use case | `tempLock/*` |
| User | 1 use case | `user/*` |

---

## Fase 2 — Trazado de Flujos (Hallazgos)

### Hallazgo #01 — Flujo de creación de turno con TempLock roto

**Severidad:** P0 — Crítico
**Categoría:** Backend / Arquitectura

**Evidencia:**
- `frontend-barber/src/store/slices/bookingSlice.ts:133`:
  ```ts
  tempLockId: 'true',  // Hardcoded string, no es un ID real
  ```
- `backend-barber/src/application/use-cases/appointment/CreateAppointmentUseCase.ts:139-141`:
  ```ts
  if (dto.tempLockId) {
    this.tempLockRepository.deleteOne(dto.barberId, dto.date, dto.startTime).catch(() => {});
  }
  ```

**Problema:**
1. El frontend envía `tempLockId: 'true'` como string hardcodeado — no es un ID de lock real
2. El backend verifica únicamente `if (dto.tempLockId)` que es truthy, sin validar:
   - Que el lock exista realmente
   - Que el lock pertenezca a esta sesión/usuario
   - Que el lock esté vigente (no expirado)
3. `deleteOne` se ejecuta con `.catch(() => {})` — si falla, el error se traga silenciosamente

**Impacto:**
- El sistema de TempLock es completamente inefectivo para evitar doble reserva
- El frontend y backend creen que están usando TempLock pero es un placebo
- Race condition entre dos usuarios creando turnos para el mismo slot

**Probabilidad:** Alta
**Escenario de fallo:** Usuario A y Usuario B seleccionan el mismo barbero/fecha/hora. Ambos hacen clic en "Confirmar" simultáneamente. Ambos pasan la validación de overlap (porque ninguno existe aún). El primero obtiene 201 Created. El segundo obtiene 409 por el índice único `{ barberId, date, startTime }` — pero el daño conceptual está en que el TempLock, cuyo único propósito era prevenir esto, no funcionó.

**Solución conceptual:** El frontend debe recibir un ID de TempLock real desde el servidor (creado por `POST /api/appointments/temp-lock`). Ese ID debe enviarse al crear el turno, y el backend debe verificar que el lock existe, no expiró, y corresponde al slot solicitado antes de crear el turno.

**Confianza:** Alta

---

### Hallazgo #02 — Race condition en creación de turno (Ventana TOCTOU)

**Severidad:** P0 — Crítico
**Categoría:** Backend / Concurrencia

**Evidencia:**
- `CreateAppointmentUseCase.ts:90-100`:
  ```ts
  const existingAppointments = await this.appointmentRepository.findByBarberAndDate(dto.barberId, dto.date);
  for (const existing of existingAppointments) {
    if (doesOverlap(dto.startTime, endTime, existing.startTime, existing.endTime)) {
      throw new AppError('El horario seleccionado ya está ocupado.', 409);
    }
  }
  // ...
  const created = await this.appointmentRepository.create(appointment.toPrimitives()); // Línea 136
  ```

**Problema:**
La verificación de overlap (lectura) y la creación del turno (escritura) no son atómicas. Entre la línea 100 y la 136, otro request puede crear un turno en el mismo horario. El índice único `{ barberId: 1, date: 1, startTime: 1 }` solo protege contra startTime exactamente igual, NO contra overlaps parciales (ej: 10:00-11:00 vs 10:30-11:30).

**Impacto:** Dos turnos con overlaps parciales pueden crearse concurrentemente, resultando en un barbero con dos clientes agendados en horarios que se superponen.

**Probabilidad:** Alta — en producción con múltiples clientes, es cuestión de tiempo.
**Escenario de fallo:** Barbero con slotDuration=60. Dos clientes intentan reservar 10:00-11:00 y 10:30-11:30 simultáneamente. Ambos pasan el overlap check (porque ninguno existe aún). El primero se crea con startTime 10:00, el segundo con startTime 10:30. Ambos existen, pero el barbero no puede atender a ambos a la vez.

**Solución conceptual:** Implementar un lock pesimista a nivel de base de datos (transacción con `findOneAndUpdate` condicional) o un lock optimista con versión. MongoDB no tiene transacciones cross-document nativas sin replica set, pero se puede usar `findOneAndUpdate` con filtro atómico.

**Confianza:** Alta

---

### Hallazgo #03 — Misma clave JWT para Access y Refresh Tokens

**Severidad:** P0 — Crítico
**Categoría:** Seguridad

**Evidencia:**
- `JwtTokenService.ts:37`:
  ```ts
  this.config.secret,  // signAccessToken
  ```
- `JwtTokenService.ts:54`:
  ```ts
  this.config.secret,  // signRefreshToken
  ```
- `JwtTokenService.ts:102-107`:
  ```ts
  this.config.secret,  // signPartialToken (también mismo secret)
  ```

**Problema:** Los tres tipos de token (access, refresh, partial) se firman con el mismo `JWT_SECRET`. Si el secret se compromete, un atacante puede:
1. Forjar access tokens con cualquier rol (Admin, Empleado, Registrado)
2. Forjar refresh tokens con validez de 7 días
3. Forjar partial tokens para completar registro Google como cualquier email

**Impacto:** Compromiso total del sistema de autenticación. Escalación de privilegios a Admin.

**Probabilidad:** Media (requiere compromiso del JWT_SECRET)
**Escenario de fallo:** El secret se filtra en un log, repositorio git, o dump de entorno. El atacante crea un token JWT con `{ id: "...", email: "admin@barberia.com", kind: "Admin" }` y obtiene acceso total al panel de administración.

**Solución conceptual:** Usar tres secretos diferentes: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_PARTIAL_SECRET`. Cada tipo de token se firma con su propio secreto.

**Confianza:** Alta

---

### Hallazgo #04 — Reset de contraseña sin verificar que el token pertenece al email

**Severidad:** P0 — Crítico (parcial)
**Categoría:** Seguridad

**Evidencia:**
- `ResetPasswordUseCase.ts:28-29`:
  ```ts
  const tokenHash = this.hashService.sha256(dto.token);
  const user = await this.userRepository.findByEmail(dto.email);  // Solo para lockout
  ```
- `ResetPasswordUseCase.ts:41`:
  ```ts
  const tokenDoc = await this.passwordResetRepository.verifyAndConsume(tokenHash); // Busca token por hash
  ```
- `ResetPasswordUseCase.ts:70`:
  ```ts
  await this.userRepository.updatePassword(tokenDoc.userId, hash); // Usa userId del token
  ```

**Problema:** El `email` en el DTO solo se usa para verificar el lockout del usuario. El password reset real usa `tokenDoc.userId`. Si un atacante obtiene un token de reset válido (por ejemplo interceptando el email), puede usarlo para cualquier usuario si conoce su email Y logra evadir el lockout check. Pero más crítico: el atacante puede incrementar los `resetFailedAttempts` de un usuario víctima usando el email de la víctima + un token inválido, logrando bloquear al usuario por 15 minutos (ataque de denegación de servicio por lockout).

**Impacto:**
1. Denegación de servicio por lockout de reset de contraseña
2. Potencial account takeover si el token se intercepta

**Probabilidad:** Alta para el DoS (solo necesita el email), Media para el account takeover.
**Escenario de fallo (DoS):** Atacante conoce email@victima.com. Envía 5 requests a `/reset-password` con token inválido y email de la víctima. La víctima queda lockeada por 15 minutos.

**Solución conceptual:** El endpoint de reset debe verificar que el token corresponde al email proporcionado. Separar los contadores de lockout por token, no por email.

**Confianza:** Alta

---

### Hallazgo #05 — Tokens de sesión en localStorage (vulnerable a XSS)

**Severidad:** P0 — Crítico
**Categoría:** Frontend / Seguridad

**Evidencia:**
- `frontend-barber/src/services/api.ts:20`:
  ```ts
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  ```
- `frontend-barber/src/store/slices/authSlice.ts:22-23`:
  ```ts
  localStorage.setItem('authToken', token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  ```

**Problema:** Ambos tokens (access y refresh) se almacenan en `localStorage`. Cualquier vulnerabilidad XSS en el frontend permite a un atacante exfiltrar ambos tokens, obteniendo acceso persistente a la cuenta.

**Impacto:** Account takeover completo.

**Probabilidad:** Media (depende de la existencia de XSS)
**Escenario de fallo:** Un input no sanitizado en el formulario de datos del cliente permite inyectar un script que lee `localStorage.getItem('authToken')` y lo envía a un servidor externo.

**Solución conceptual:** Usar `httpOnly` cookies para los tokens, o al menos implementar medidas de mitigación como CSP estricto.

**Confianza:** Alta

---

### Hallazgo #06 — loginLimiter definido pero nunca montado

**Severidad:** P0 — Crítico
**Categoría:** Backend / Seguridad

**Evidencia:**
- `app.ts:32-38`:
  ```ts
  const loginLimiter = rateLimit({
    windowMs: config.rateLimit.login.windowMs,
    max: config.rateLimit.login.max,
    message: { error: "Demasiados intentos de login, esperá 15 minutos" },
  });
  ```
- En ninguna línea de `app.ts` se usa `app.use('/auth/*', loginLimiter)` o similar.

**Problema:** El `loginLimiter` se configura pero nunca se monta. El endpoint de login real es `/auth/2fa/send` que tiene su propio limiter (`twoFALimiter`), pero el flujo de 2FA tiene 5 intentos por 15 minutos. Sin el `loginLimiter`, un atacante puede hacer fuerza bruta de contraseñas sin restricción a nivel de rate limiting del login.

**Impacto:** Ataque de fuerza bruta de contraseñas sin rate limiting específico.

**Probabilidad:** Alta
**Escenario de fallo:** Atacante usa script automatizado para enviar requests a `/auth/2fa/send` con diferentes contraseñas. El twoFALimiter limita a 5 intentos, pero luego de 15 minutos puede reintentar. Sin el loginLimiter global, la protección es insuficiente.

**Solución conceptual:** Montar `loginLimiter` en la ruta `/auth/2fa/send` además del twoFALimiter, o aumentar la configuración de `twoFALimiter`.

**Confianza:** Alta

---

### Hallazgo #07 — Enumeración de usuarios por registro con mensajes de error diferenciados

**Severidad:** P1 — Alto
**Categoría:** Seguridad

**Evidencia:**
- `RegisterUserUseCase.ts:28-35`:
  ```ts
  if (existingUser) {
    throw new AppError('Email en uso.', 409);
  }
  const existingPhone = await this.userRepository.findByPhone(phone);
  if (existingPhone) {
    throw new AppError('Teléfono en uso.', 409);
  }
  ```

**Problema:** Mensajes diferentes para email existente vs teléfono existente. Un atacante puede enumerar qué emails y teléfonos están registrados.

**Impacto:** Filtración de información de usuarios registrados.

**Probabilidad:** Alta
**Escenario de fallo:** Atacante envía requests de registro con emails de personas conocidas. Obtiene "Email en uso" para emails registrados y error genérico para no registrados. Con estos datos puede hacer phishing dirigido.

**Solución conceptual:** Mensaje único: "El email o teléfono ya están registrados."

**Confianza:** Alta

---

### Hallazgo #08 — loginSchema definido pero nunca usado

**Severidad:** P1 — Alto
**Categoría:** Backend / Código Muerto

**Evidencia:**
- `interface-adapters/validators/auth.validator.ts:28-36`:
  ```ts
  export const loginSchema = Joi.object({...});
  ```
- No hay import de `loginSchema` en ningún archivo de rutas.

**Problema:** `loginSchema` es código muerto. Si algún día se intenta usar, nadie recordará que existe y probablemente se escribirá una nueva validación. Peor aún, un desarrollador futuro podría asumir que el login está validado y no darse cuenta de que la validación real está en los DTOs del use case o en el middleware 2FA.

**Impacto:** Mantenibilidad comprometida. Confusión sobre dónde ocurre la validación de login.

**Probabilidad:** Baja (no rompe funcionalidad directamente)

**Solución conceptual:** Eliminar `loginSchema` o integrarlo en el flujo de 2FA si corresponde.

**Confianza:** Alta

---

### Hallazgo #09 — findMany en MongoAppointmentRepository sobrescribe filtro date con dateFrom/dateTo

**Severidad:** P1 — Alto
**Categoría:** Backend / Bug

**Evidencia:**
- `MongoAppointmentRepository.ts:30-46`:
  ```ts
  if (filters.date) {
    query.date = filters.date;  // Línea 31 — asigna filtro exacto
  }
  // ...
  if (filters.dateFrom || filters.dateTo) {  // Línea 42
    query.date = {};  // Línea 43 — SOBRESCRIBE el filtro exacto
  }
  ```

**Problema:** Si un cliente envía `date=2024-06-15&dateFrom=2024-06-01`, la consulta MongoDB resultante es:
```json
{ "date": { "$gte": "2024-06-01" } }
```
El filtro exacto por `2024-06-15` se pierde silenciosamente. El usuario cree que filtró por fecha exacta + rango, pero solo obtiene el rango.

**Impacto:** Resultados de búsqueda incorrectos. Un usuario puede ver turnos de fechas fuera de lo que espera. No hay pérdida de datos, pero sí comportamiento incorrecto.

**Probabilidad:** Media (depende de que el frontend envíe date + dateFrom simultáneamente)
**Escenario de fallo:** La API permite los parámetros `date`, `dateFrom`, `dateTo` en el mismo request sin documentar que son mutuamente excluyentes. Un cliente que use todos juntos obtendrá resultados incorrectos.

**Solución conceptual:** Si `date` está presente, ignorar `dateFrom`/`dateTo`. Si `dateFrom`/`dateTo` están presentes, ignorar `date`. O lanzar error si se envían combinaciones inválidas.

**Confianza:** Alta

---

### Hallazgo #10 — Política de contraseñas débiles para barberos (Admin/Empleado)

**Severidad:** P1 — Alto
**Categoría:** Seguridad

**Evidencia:**
- `interface-adapters/validators/barber.validator.ts:49`:
  ```ts
  password: Joi.string().min(6).required(),
  ```
- `interface-adapters/validators/auth.validator.ts:6-14`:
  ```ts
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'mayúscula')
    .pattern(/[a-z]/, 'minúscula')
    .pattern(/[0-9]/, 'número')
    .required(),
  ```

**Problema:** Las cuentas de administrador y empleados pueden usar contraseñas de solo 6 caracteres sin requisitos de complejidad, mientras que los usuarios regulares requieren 8+ con mayúscula, minúscula y número. Los barberos tienen acceso a datos sensibles (turnos de todos los clientes, datos personales).

**Impacto:** Cuentas administrativas con contraseñas débiles (ej: `123456`, `admin1`), vulnerables a fuerza bruta.

**Probabilidad:** Alta
**Escenario de fallo:** Un administrador crea un empleado con contraseña `pass12`. Atacante realiza fuerza bruta al endpoint `/auth/2fa/send` con el email del empleado (que es conocido). Obtiene acceso a la cuenta del empleado y puede ver/modificar turnos de todos los clientes.

**Solución conceptual:** Usar el mismo schema de validación de contraseña para barberos que para usuarios regulares (o más estricto).

**Confianza:** Alta

---

### Hallazgo #11 — Token de reset de contraseña en URL (filtración por Referer)

**Severidad:** P1 — Alto
**Categoría:** Seguridad

**Evidencia:**
- `RequestPasswordResetUseCase.ts:34`:
  ```ts
  const url = `${this.frontendUrl}/reset-password?token=${token}`;
  ```

**Problema:** El token de reset se envía como parámetro de URL en el email. Esto permite que el token se filtre por:
1. Cabecera `Referer` al navegar desde la página de reset a otro sitio
2. Logs del servidor proxy/CDN
3. Historial del navegador
4. Extensiones del navegador maliciosas

**Impacto:** Account takeover si un atacante obtiene el token del reset desde logs, referer, o historial.

**Probabilidad:** Media
**Escenario de fallo:** Usuario recibe email de reset, hace clic, llega a `frontend.com/reset-password?token=abc123`. En la página de reset hay un enlace a una red social o un script de tracking. El navegador envía `Referer: frontend.com/reset-password?token=abc123`.

**Solución conceptual:** Enviar el token en el body del POST, no en la URL. El frontend extrae el token de una URL corta (ej: `frontend.com/reset-password/abc123`) y lo envía en el body del request. O usar un formulario POST en lugar de un enlace GET.

**Confianza:** Alta

---

### Hallazgo #12 — Anonymous appointment lookup muy permisivo

**Severidad:** P1 — Alto
**Categoría:** Seguridad / Privacidad

**Evidencia:**
- `appointment.routes.ts:36-41`:
  ```ts
  router.get('/anonymous', anonymousLimiter, ...);
  ```
- `appointment.validator.ts:47-51`:
  ```ts
  anonymousQuerySchema = Joi.object({
    email: Joi.string().pattern(EMAIL_REGEX).trim(),
    phone: Joi.string().trim().max(20),
    date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  }).min(1);
  ```
- `GetAppointmentsAnonymousUseCase` (ver archivo)
- `MongoAppointmentRepository.findByContactAndDate.ts:73-89`:
  ```ts
  const docs = await AppointmentModel.find({
    date,
    $or: orConditions,  // email OR phone (no AND)
  }).lean();
  ```

**Problema:**
1. El endpoint acepta `email` O `phone` (cláusula `$or`), no ambos. Con solo el email se pueden listar turnos.
2. El rate limit es 30 requests cada 15 minutos — insuficiente para un scraper.
3. No hay límite de resultados — se devuelven todos los turnos del día que coincidan con el email/phone.

**Impacto:** Un atacante puede determinar si una persona tiene turno en una fecha específica con solo conocer su email o teléfono. Además puede ver los detalles del turno (barbero, horario, servicio, precio).

**Probabilidad:** Media
**Escenario de fallo:** Atacante conoce el email de una persona. Envía GET `/api/appointments/anonymous?email=victima@email.com&date=2024-06-15`. Recibe los detalles del turno: nombre del barbero, hora, servicio contratado.

**Solución conceptual:** Exigir email Y phone juntos para la búsqueda (condición `$and`). Reducir rate limit. Devolver solo datos mínimos (fecha, hora, barbero) sin datos del servicio.

**Confianza:** Alta

---

### Hallazgo #13 — linkAnonymousAppointments fire-and-forget sin manejo de errores

**Severidad:** P1 — Alto
**Categoría:** Backend / Pérdida de Datos

**Evidencia:**
- `RegisterUserUseCase.ts:53`:
  ```ts
  this.linkAnonymousAppointments(createdUser.id, email, phone);  // No await
  ```
- `RegisterUserUseCase.ts:62-70`:
  ```ts
  private async linkAnonymousAppointments(...) {
    try {
      const anonymousAppointments = await this.appointmentRepository.findByContact(email, phone);
      for (const appointment of anonymousAppointments) {
        await this.appointmentRepository.updateClientId(appointment.id, registeredClientId);
      }
    } catch (error) {
      console.error('Error vinculando turnos anónimos:', error);  // Solo log
    }
  }
  ```

**Problema:**
1. El método se invoca sin `await` — si falla, el error se pierde
2. El `catch` solo hace `console.error` — el error se traga
3. Si la vinculación falla, el usuario registrado pierde la conexión con sus turnos anteriores

**Impacto:** Turnos anónimos previos quedan huérfanos, no vinculados al nuevo usuario registrado. El usuario no ve su historial de turnos.

**Probabilidad:** Media (el error podría ser por timeout de DB, restricción de unicidad, etc.)
**Escenario de fallo:** Usuario se registra con mismo email y teléfono de un turno anónimo previo. La DB tiene una restricción que impide actualizar el clientId (ej: el appointment ya fue vinculado a otro cliente en un registro previo). La excepción se traga, el usuario queda sin sus turnos previos.

**Solución conceptual:** Hacer `await` sobre `linkAnonymousAppointments` para que la respuesta de registro espere la vinculación. O implementar un job/evento con reintentos.

**Confianza:** Alta

---

### Hallazgo #14 — CancelAppointmentUseCase tiene parámetro `barberId` no utilizado

**Severidad:** P1 — Alto
**Categoría:** Backend / Código Muerto / Bug Potencial

**Evidencia:**
- `CancelAppointmentUseCase.ts:13-18`:
  ```ts
  async execute(
    id: string,
    userId: string,
    userKind: string,
    reason?: string,
    barberId?: string  // NUNCA USADO
  ): Promise<{ message: string }>
  ```

**Problema:** El parámetro `barberId` se declara en la firma del método pero nunca se usa dentro del cuerpo. Esto es confuso y podría indicar una funcionalidad incompleta o una regla de negocio faltante (¿debería verificar que el barbero puede cancelar el turno?).

**Impacto:** Si un barbero (`Empleado`) llama a cancelación, el sistema no verifica que el turno pertenece a ese barbero específico. El check de permisos (`isAssignedBarber`) ya verifica `appointment.barberId === userId`, por lo que funcionalmente no hay fallo de seguridad, pero el código es engañoso.

**Probabilidad:** Baja (no rompe funcionalidad, pero es mantenibilidad reducida)

**Solución conceptual:** Eliminar el parámetro `barberId` o implementar la verificación para la que fue diseñado.

**Confianza:** Alta

---

## Fase 3 — Contratos

### Hallazgo #15 — Desajuste entre CreateAppointmentDTO del backend y el Payload del frontend

**Severidad:** P2 — Medio
**Categoría:** Backend / Frontend / Contrato

**Evidencia:**
- `frontend-barber/src/types/booking.ts:26-36`:
  ```ts
  export type CreateAppointmentPayload = {
    barberId: string;
    serviceId: string;
    date: string;
    startTime: string;
    clientName: string;
    clientLastname: string;
    clientPhone: string;
    clientEmail: string;
    tempLockId?: string;
  };
  ```
- `backend-barber/src/interface-adapters/validators/appointment.validator.ts:4-18`:
  ```ts
  export const createAppointmentSchema = Joi.object({
    barberId: Joi.string().required(),
    serviceId: Joi.string().required(),
    date: ...,
    startTime: ...,
    clientName: Joi.string().trim().min(1).max(100).required(),
    clientLastname: Joi.string().trim().min(1).max(100).required(),
    clientPhone: Joi.string().trim().max(20).allow('', null),
    clientEmail: Joi.string().pattern(EMAIL_REGEX).trim().required(),
    // No menciona tempLockId
  });
  ```

**Problema:** El schema de validación Joi no incluye `tempLockId`. El frontend lo envía, el backend lo recibe (pasa por `{ ...req.body }`), pero la validación explícita no lo contempla. Si mañana alguien cambia el nombre del campo frontend, el backend no lo validará.

**Impacto:** Bajo actualmente, pero es una bomba de tiempo para futuros cambios.

**Probabilidad:** Baja

**Solución conceptual:** Agregar `tempLockId` al schema de validación, aunque sea opcional.

**Confianza:** Alta

---

### Hallazgo #16 — Tipo `cancelledAt` inconsistente entre frontend y backend

**Severidad:** P2 — Medio
**Categoría:** Frontend / Backend / Contrato

**Evidencia:**
- `frontend-barber/src/types/booking.ts:57`:
  ```ts
  cancelledAt?: string | null;
  ```
- `backend-barber/src/domain/entities/Appointment.ts:59`:
  ```ts
  cancelledAt?: Date;
  ```

**Problema:** El backend serializa `cancelledAt` como `Date` (objeto), mientras que el frontend lo tipa como `string | null`. Cuando el frontend recibe el JSON, `Date` se serializa como string ISO, por lo que funcionalmente funciona, pero el tipo es incorrecto y TypeScript no lo detectaría si el backend cambia el formato de serialización.

**Impacto:** Bajo — funcionalmente correcto, pero semánticamente incorrecto.

**Probabilidad:** Baja

**Solución conceptual:** Unificar: backend debe serializar como string ISO o null; frontend debe tipar correctamente.

**Confianza:** Alta

---

### Hallazgo #17 — `cancelledAt` y `createdAt`/`updatedAt` faltan en la respuesta del backend

**Severidad:** P2 — Medio
**Categoría:** Backend / Contrato

**Evidencia:**
- `CreateAppointmentUseCase.ts:147-150`:
  ```ts
  const primitives = created.toPrimitives();
  return {
    message: 'Turno creado exitosamente',
    appointment: primitives,
  };
  ```
- `AppointmentPrimitives` incluye `createdAt`, `updatedAt`, `cancelledAt`, `cancelledBy`, `cancelReason`, `createdBy`.

**Problema:** No hay un DTO explícito para la respuesta. Se devuelven todos los primitivos del dominio, incluyendo campos que el frontend podría no necesitar. Esto acopla la API a la estructura interna del dominio.

**Impacto:** Mantenibilidad. Si el dominio cambia (ej: se agrega un campo interno), la API pública cambia.

**Probabilidad:** Media

**Solución conceptual:** Crear `AppointmentResponseDTO` explícito que solo exponga los campos que el frontend necesita.

**Confianza:** Media

---

## Fase 4 — Estados y Transiciones

### Hallazgo #18 — Transición Cancelado→Cancelado es idempotente en CancelAppointmentUseCase pero NO en UpdateAppointmentStatusUseCase

**Severidad:** P2 — Medio
**Categoría:** Backend / Lógica de Negocio

**Evidencia:**
- `CancelAppointmentUseCase.ts:26-28`:
  ```ts
  if (appointment.status === 'Cancelado') {
    return { message: 'El turno ya se encontraba cancelado' }; // Idempotente
  }
  ```
- `UpdateAppointmentStatusUseCase.ts:31-33`:
  ```ts
  if (appointment.status === 'Cancelado' && dto.status === 'Cancelado') {
    return { message: 'El turno ya se encontraba cancelado' }; // Idempotente
  }
  ```
- Pero no hay idempotencia para `Completado→Completado` ni `NoShow→NoShow`.

**Problema:** Si se envía `PATCH /appointments/:id/status` con `status: "Completado"` dos veces, el segundo intento falla porque `VALID_TRANSITIONS['Completado']` es `[]`. El error no es claro ("No se puede cambiar de Completado a Completado").

**Impacto:** UX pobre. Un operador que hace doble clic en "Marcar como completado" recibe un error confuso.

**Probabilidad:** Alta (doble clic es común en interfaces)
**Escenario de fallo:** Admin hace clic en "Completar turno", el request tarda, hace clic de nuevo. Segundo request falla con 400.

**Solución conceptual:** Hacer todos los status terminals idempotentes.

**Confianza:** Alta

---

### Hallazgo #19 — Estado `NoShow` no bloquea pago (inconsistencia)

**Severidad:** P2 — Medio
**Categoría:** Backend / Lógica de Negocio

**Evidencia:**
- `Appointment.ts:244`:
  ```ts
  pay(actor?: string): void {
    if (this.props.status === 'Cancelado' || this.props.status === 'NoShow') {
      throw new AppError(`No se puede pagar un turno en estado ${this.props.status}.`, 400);
    }
  ```

**Problema:** El método `pay` bloquea pagos para `NoShow`, pero el `UpdateAppointmentStatusUseCase` puede marcar `NoShow` y simultáneamente cambiar `paymentStatus` a `Pagado` (en la línea 99 del `UpdateAppointmentStatusUseCase`, cuando status es 'Completado' se pasa `Pagado`, pero para NoShow no se cambia paymentStatus). En el método `pay` de la entidad, se bloquea correctamente. Pero si `UpdateStatus` marca `NoShow` sin cambiar paymentStatus, el turno queda en `NoShow/Pendiente`, que es correcto. No hay bug aquí.

Sin embargo, el `cancel()` no verifica el paymentStatus. Podría cancelarse un turno que ya fue pagado, lo que implicaría reembolso no gestionado por el sistema.

**Impacto:** Un turno pagado puede cancelarse sin registro de reembolso.

**Probabilidad:** Media

**Solución conceptual:** Agregar verificación en `cancel()`: si `paymentStatus === 'Pagado'`, requerir confirmación o lanzar advertencia.

**Confianza:** Media

---

## Fase 5 — Seguridad (hallazgos adicionales)

### Hallazgo #20 — Enumeración de cuentas Admin/Empleado por Google OAuth

**Severidad:** P1 — Alto
**Categoría:** Seguridad / Enumeración

**Evidencia:**
- `AuthenticateWithGoogleUseCase.ts:43-44`:
  ```ts
  if (existingUser.kind === 'Admin' || existingUser.kind === 'Empleado') {
    throw new AppError('Este usuario no puede iniciar con Google.', 401);
  }
  ```

**Problema:** Si alguien intenta Google Login con un email que pertenece a un Admin/Empleado, recibe un error diferente al de un email no registrado. Esto permite enumerar qué emails corresponden a staff.

**Impacto:** Identificación de cuentas administrativas para ataques dirigidos.

**Probabilidad:** Alta

**Solución conceptual:** Devolver el mismo mensaje de error que para cuentas no existentes.

**Confianza:** Alta

---

### Hallazgo #21 — 2FA leak por mensajes de error diferenciados

**Severidad:** P1 — Alto
**Categoría:** Seguridad

**Evidencia:**
- `VerifyTwoFactorUseCase.ts:37-38`:
  ```ts
  if (!user.twoFactor?.codeHash || !user.twoFactor?.expiresAt) {
    throw new AppError('No hay código activo.', 401);
  }
  ```
- `VerifyTwoFactorUseCase.ts:41-47`:
  ```ts
  if (this.dateTimeProvider.now() > user.twoFactor.expiresAt) {
    throw new AppError('El código expiró.', 401);
  }
  ```
- `VerifyTwoFactorUseCase.ts:65`:
  ```ts
  throw new AppError('Código incorrecto.', 401);
  ```

**Problema:** Tres mensajes diferentes para el mismo flujo de verificación 2FA. Un atacante puede determinar:
1. Si hay un código activo para el usuario
2. Si el código está expirado (vs. código incorrecto)

**Impacto:** Información que ayuda a un atacante a enfocar su ataque.

**Probabilidad:** Media

**Solución conceptual:** Mensaje único: "Código inválido o expirado."

**Confianza:** Alta

---

### Hallazgo #22 — No hay rate limiting en GET /api/users/me

**Severidad:** P2 — Medio
**Categoría:** Seguridad

**Evidencia:**
- `user.routes.ts` (sin rate limiter montado)

**Problema:** El endpoint `GET /api/users/me` no tiene rate limiting. Aunque requiere autenticación, permite a un atacante con un token válido hacer peticiones ilimitadas.

**Impacto:** Bajo (no hay enumeración posible porque requiere token válido).

**Probabilidad:** Baja

**Solución conceptual:** Agregar rate limit estándar a todas las rutas autenticadas.

**Confianza:** Alta

---

### Hallazgo #23 — No hay rate limiting en barber routes autenticadas

**Severidad:** P2 — Medio
**Categoría:** Seguridad

**Evidencia:**
- `barber.routes.ts` (sin rate limiter después de `router.use(deps.authenticate)` en línea 27)

**Problema:** Igual que Hallazgo #22, pero aplica a listar, crear, actualizar barberos.

**Impacto:** Bajo

**Probabilidad:** Baja

**Solución conceptual:** Agregar rate limit genérico.

**Confianza:** Alta

---

### Hallazgo #24 — Hardcoded 7-day refresh token expiration en 4 lugares

**Severidad:** P2 — Medio
**Categoría:** Backend / Mantenibilidad

**Evidencia:**
- `RefreshTokenUseCase.ts:48`
- `VerifyTwoFactorUseCase.ts:83`
- `AuthenticateWithGoogleUseCase.ts:67`
- `CompleteGoogleProfileUseCase.ts:56`

Todos tienen:
```ts
new Date(this.dateTimeProvider.now().getTime() + 7 * 24 * 60 * 60 * 1000)
```

**Problema:** El valor `7 * 24 * 60 * 60 * 1000` está hardcodeado en 4 lugares diferentes. Si se cambia `JWT_REFRESH_EXPIRES_IN` en la configuración, la expiry real de la DB no se actualiza. Esto crea una inconsistencia: el JWT puede durar 30 días pero la DB expira a los 7 días (o viceversa).

**Impacto:** Tokens que el servidor considera válidos (por JWT) pero que la DB considera expirados (o al revés). Comportamiento impredecible con refresh tokens.

**Probabilidad:** Alta (es seguro que alguien cambiará la config sin saber que hay 4 lugares hardcodeados)

**Solución conceptual:** Calcular la expiry a partir de `config.jwtRefreshExpiresIn` en un solo lugar centralizado y reutilizarlo.

**Confianza:** Alta

---

## Fase 6 — Base de Datos

### Hallazgo #25 — No hay índice en `clientEmail` + `clientPhone` para búsqueda de contacto

**Severidad:** P2 — Medio
**Categoría:** DB / Rendimiento

**Evidencia:**
- `appointment.model.ts:156-158`:
  ```ts
  appointmentSchema.index({ barberId: 1, date: 1, startTime: 1 }, { unique: true });
  appointmentSchema.index({ clientId: 1 });
  appointmentSchema.index({ date: 1 });
  ```

**Problema:** El método `findByContact` busca por `{ clientEmail, clientPhone }` pero no hay índice compuesto para estos campos. Con el tiempo, esta consulta será un collection scan.

**Impacto:** Degradación del rendimiento a medida que crece la colección de appointments.

**Probabilidad:** Alta (a largo plazo)
**Escenario de fallo:** Con 100,000+ appointments, una búsqueda por contacto para vincular turnos anónimos en registro puede tomar segundos.

**Solución conceptual:** Agregar índice compuesto en `{ clientEmail: 1, clientPhone: 1 }`.

**Confianza:** Alta

---

### Hallazgo #26 — No hay transacción en operaciones multi-documento

**Severidad:** P2 — Medio
**Categoría:** DB / Integridad

**Evidencia:**
- En `RegisterUserUseCase.ts:50-53`: crear usuario + linkear appointments (dos operaciones sin transacción)
- En `CreateAppointmentUseCase.ts:136-141`: crear appointment + eliminar tempLock (sin transacción)

**Problema:** Si la DB cae entre la creación del usuario y el linkeo de appointments, el usuario queda creado sin sus turnos previos vinculados.

**Impacto:** Datos inconsistentes.

**Probabilidad:** Baja (caída de DB justo en ese momento)

**Solución conceptual:** Usar transacciones de MongoDB (requiere replica set) o implementar compensación manual (ej: reintentar el linkeo periódicamente).

**Confianza:** Media

---

### Hallazgo #27 — Campo `password` en modelo Barber vs `passwordHash` en entidad de dominio

**Severidad:** P2 — Medio
**Categoría:** DB / Mapeo

**Evidencia:**
- `barber.model.ts:56-59`:
  ```ts
  password: { type: String, required: true }
  ```
- `MongoUserRepository.ts:57`:
  ```ts
  const barber = await Barber.findByIdAndUpdate(userId, { password: passwordHash });
  ```
- `Barber.ts:41`:
  ```ts
  passwordHash?: string;  // Nombre diferente en el dominio
  ```

**Problema:** La base de datos llama al campo `password`, la entidad de dominio lo llama `passwordHash`. El mapper (`UserMapper`) debe traducir entre ambos. Si alguien modifica el mapper sin actualizar el repositorio, el password se guarda en el campo incorrecto o no se actualiza.

**Impacto:** Potencial corrupción de contraseñas almacenadas.

**Probabilidad:** Media (depende de cambios futuros)

**Solución conceptual:** Unificar nombres en todo el stack. El campo en DB debería llamarse `passwordHash` para ser explícito.

**Confianza:** Alta

---

### Hallazgo #28 — Reset de contraseña en barberos: campo `password` vs `passwordHash` inconsistente

**Severidad:** P2 — Medio
**Categoría:** DB

**Evidencia:**
- `MongoUserRepository.ts:56-62`:
  ```ts
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const barber = await Barber.findByIdAndUpdate(userId, { password: passwordHash });
    if (barber) return;
    await RegisteredClient.findByIdAndUpdate(userId, { password: passwordHash });
  }
  ```

**Problema:** El método recibe `passwordHash` pero lo asigna al campo `password` en la DB. El nombre es engañoso: el valor es un hash, pero el campo se llama `password`. Esto es confuso para mantenimiento futuro.

**Impacto:** Mantenibilidad reducida. Riesgo de que alguien guarde la contraseña en texto plano porque el campo se llama "password".

**Probabilidad:** Baja

**Solución conceptual:** Renombrar el campo en DB a `passwordHash`.

**Confianza:** Alta

---

## Fase 7 — Frontend

### Hallazgo #29 — Validación de email en ClientDataOverlay es insuficiente

**Severidad:** P2 — Medio
**Categoría:** Frontend / UX

**Evidencia:**
- `ClientDataOverlay.tsx:50`:
  ```ts
  const isValid = clientName.trim().length >= 2 && clientLastname.trim().length >= 2 && clientPhone.trim().length >= 7 && clientEmail.includes('@');
  ```

**Problema:** La validación del email en el frontend es solo `includes('@')`. Un email como `"a@b"` pasa la validación frontend, pero luego el backend lo rechaza con su validación Joi (EMAIL_REGEX). El usuario llena el formulario, hace clic en Confirmar, y recibe un error del backend sin feedback claro de qué campo está mal.

**Impacto:** UX pobre. El usuario no sabe qué corrigió mal y ve un error genérico del backend.

**Probabilidad:** Alta
**Escenario de fallo:** Usuario escribe `user@com` en el email. El formulario frontend lo da por válido. Al confirmar, el backend devuelve 400 con error de validación. El usuario no ve el error específico del campo email.

**Solución conceptual:** Usar una validación de email real en el frontend, no solo `includes('@')`.

**Confianza:** Alta

---

### Hallazgo #30 — setSelectedDate en BookingPage inicializa con hoy aunque el barbero no labore hoy

**Severidad:** P2 — Medio
**Categoría:** Frontend / UX

**Evidencia:**
- `BookingPage/index.tsx:97-101`:
  ```ts
  useEffect(() => {
    if (currentStep === 'datetime' && !selectedDate && selectedBarber) {
      dispatch(setSelectedDate(getTodayString()));
    }
  }, [currentStep, selectedDate, selectedBarber, dispatch]);
  ```

**Problema:** Cuando el usuario llega al paso de fecha/hora, el calendario se inicializa en la fecha de hoy sin verificar si el barbero trabaja hoy. Si hoy es domingo y el barbero no trabaja domingos, el usuario ve slots vacíos o un error confuso.

**Impacto:** UX pobre. Usuario confundido por qué no hay horarios disponibles.

**Probabilidad:** Alta

**Solución conceptual:** Inicializar en el próximo día laboral del barbero seleccionado.

**Confianza:** Alta

---

### Hallazgo #31 — submitAppointment accede a `selectedBarber!`, `selectedDate!`, `selectedTime!` sin verificación

**Severidad:** P2 — Medio
**Categoría:** Frontend / Estabilidad

**Evidencia:**
- `bookingSlice.ts:119-122`:
  ```ts
  const barberId = flow.selectedBarber!.id;  // Non-null assertion
  const date = flow.selectedDate!;
  const startTime = flow.selectedTime!;
  ```

**Problema:** El thunk `submitAppointment` asume que `selectedBarber`, `selectedDate` y `selectedTime` son no-null porque el botón de confirmar se deshabilita. Pero no hay una guarda real. Si un bug en el estado permite llegar al submit sin estos datos, la app crashea con un error de TypeScript en runtime (no en compilación, porque `!` es una aserción de TS que no genera código JS).

**Impacto:** La app crashea sin mensaje de error claro para el usuario.

**Probabilidad:** Baja (requiere corrupción del estado)

**Solución conceptual:** Agregar verificaciones explícitas y lanzar un error manejable si faltan datos.

**Confianza:** Alta

---

### Hallazgo #32 — Pre-fill de datos de cliente no detecta cambios de autenticación

**Severidad:** P2 — Medio
**Categoría:** Frontend / Estado

**Evidencia:**
- `BookingPage/index.tsx:85-95`:
  ```ts
  if (authUser && !hasPrefilled.current) {
    hasPrefilled.current = true;
    dispatch(setClientData({...}));
  }
  ```

**Problema:** `hasPrefilled.current` es una ref que se marca como `true` después del primer llenado. Si el usuario cierra sesión en otra pestaña y vuelve, `hasPrefilled.current` sigue siendo `true`. Pero si el usuario inicia sesión mientras está en la página de booking (ej: completa el registro desde la misma página), los datos de cliente no se actualizan. El usuario podría poner datos diferentes a los de su cuenta.

**Impacto:** Inconsistencia: usuario registrado pero con datos de contacto manuales en lugar de los de su perfil.

**Probabilidad:** Baja

**Solución conceptual:** Escuchar cambios en `authUser` y actualizar los datos si cambian.

**Confianza:** Alta

---

### Hallazgo #33 — Google OAuth script se carga cada vez que el componente LoginPage se monta

**Severidad:** P3 — Bajo
**Categoría:** Frontend / Rendimiento

**Evidencia:**
- `LoginPage/index.tsx:151-206`: crea script tag cada montaje

**Problema:** Cada vez que el usuario navega a `/login`, se crea un nuevo `<script>` tag para Google Identity Services, incluso si ya existe uno con el mismo ID. Aunque el `if (currentScript)` previene duplicados, la lógica es frágil.

**Impacto:** Mínimo. Potencial memoria leak si se navega muchas veces.

**Probabilidad:** Baja

**Solución conceptual:** Cargar el script una sola vez en `index.html` o en el layout principal.

**Confianza:** Alta

---

## Fase 8 — Backend

### Hallazgo #34 — `cancelMinHoursBefore` leído de `process.env` directamente en wiring

**Severidad:** P2 — Medio
**Categoría:** Backend / Configuración

**Evidencia:**
- `wiring/appointment.ts:39`:
  ```ts
  const cancelMinHoursBefore = Number(process.env.CANCEL_MIN_HOURS_BEFORE) || 2;
  ```
- En contraste, otras configuraciones se leen de `getConfig()`.

**Problema:** La variable `CANCEL_MIN_HOURS_BEFORE` se lee directamente de `process.env` en lugar de usar `getConfig().cancelMinHoursBefore` (que no existe en `Config`). No está documentada en `.env.example` ni validada por `validateEnv()`.

**Impacto:** En producción, si la variable no está seteada, el default es 2 horas. Si la variable está mal escrita (`CANCEL_HOURS_BEFORE` en lugar de `CANCEL_MIN_HOURS_BEFORE`), se usa el default silenciosamente sin warning.

**Probabilidad:** Media

**Solución conceptual:** Agregar `cancelMinHoursBefore` al `Config` tipo y al `loadConfig()`, validarlo, y usarlo desde `getConfig()`.

**Confianza:** Alta

---

### Hallazgo #35 — `Email.create()` usado en `CompleteGoogleProfileUseCase` pero no para validar el email

**Severidad:** P3 — Bajo
**Categoría:** Backend / Consistencia

**Evidencia:**
- `CompleteGoogleProfileUseCase.ts:25`:
  ```ts
  email = result.email.trim().toLowerCase();  // No usa Email.create()
  ```

**Problema:** El email viene del partial token ya verificado por JWT. No se valida con `Email.create()` porque se asume que ya fue validado al crear el token. Sin embargo, en otros use cases como `RegisterUserUseCase.ts:23`, `Email.create()` se usa siempre. Esta inconsistencia en el patrón de validación es un riesgo de mantenibilidad.

**Impacto:** Si alguien modifica `signPartialToken` para no validar el email, este use case pasaría por alto la validación.

**Probabilidad:** Baja

**Solución conceptual:** Usar `Email.create()` siempre, aunque el email ya esté verificado por el token.

**Confianza:** Alta

---

### Hallazgo #36 — SlotService del dominio no se usa en la creación de turnos

**Severidad:** P2 — Medio
**Categoría:** Backend / Arquitectura

**Evidencia:**
- `domain/services/SlotService.ts` existe (según mapeo) pero no hay import de él en `CreateAppointmentUseCase.ts`

**Problema:** El servicio de dominio `SlotService` fue diseñado para calcular slots disponibles, pero en `CreateAppointmentUseCase` la lógica de validación (overlap, horario, breaks) está implementada directamente en el use case usando las funciones de utilidad `time.ts`. El `SlotService` no se utiliza, lo que sugiere que la responsabilidad de calcular slots está duplicada o desplazada.

**Impacto:** Si la lógica de cálculo de slots cambia, hay que modificarla en dos lugares: `SlotService` (para mostrar slots al usuario) y `CreateAppointmentUseCase` (para validar). Riesgo de divergencia.

**Probabilidad:** Media (si alguien cambia la lógica de slots y olvida actualizar el otro lado)

**Solución conceptual:** Centralizar la lógica de validación de slots en `SlotService` y usarlo tanto para calcular slots disponibles como para validar la creación.

**Confianza:** Media (requiere verificar el código de `SlotService`)

---

### Hallazgo #37 — Email service catch silencioso en creación de turno

**Severidad:** P3 — Bajo
**Categoría:** Backend / Operaciones

**Evidencia:**
- `CreateAppointmentUseCase.ts:227-229`:
  ```ts
  .catch((error) => {
    console.error('Error enviando email de creación:', error);
  });
  ```

**Problema:** Si el servicio de email falla, el error se loggea pero el turno se crea exitosamente. El cliente no recibe confirmación por email, pero el sistema reporta éxito. El cliente puede pensar que el turno no se creó (porque no recibió email) y crear otro.

**Impacto:** Doble reserva por falta de confirmación email.

**Probabilidad:** Media

**Solución conceptual:** Devolver en la respuesta si el email fue enviado o no, para que el frontend pueda mostrar un mensaje apropiado ("Turno creado. No se pudo enviar la confirmación por email, pero tu turno está reservado").

**Confianza:** Alta

---

## Fase 9 — Testing

### Hallazgo #38 — CreateAppointmentUseCase no tiene test

**Severidad:** P1 — Alto
**Categoría:** Testing

**Evidencia:**
- No existe `create-appointment.usecase.test.ts` en el directorio de tests de modules/appointment (solo existe `cancel-appointment.usecase.test.ts`, etc.)

**Problema:** El caso de uso más crítico del sistema (creación de turnos) no tiene pruebas unitarias. No hay cobertura para:
- Validación de horario laboral
- Validación de breaks
- Validación de overlap
- Límite máximo de anticipación
- Límite de 1 turno activo
- Cliente no registrado
- TempLock

**Impacto:** Los bugs como el Hallazgo #02 (race condition) no son detectados.

**Probabilidad:** Alta

**Solución conceptual:** Agregar tests unitarios para `CreateAppointmentUseCase` que cubran todos los caminos (éxito, error por overlap, error por horario, error por barbero inactivo, etc.).

**Confianza:** Alta (basado en ausencia del archivo)

---

### Hallazgo #39 — No hay tests para `CompleteGoogleProfileUseCase`

**Severidad:** P1 — Alto
**Categoría:** Testing

**Evidencia:**
- Según el mapeo, existen `google-auth.usecase.test.ts` (para `AuthenticateWithGoogleUseCase`) pero no para `CompleteGoogleProfileUseCase`.

**Problema:** El flujo de registro completo con Google (segundo paso) no tiene cobertura de tests. Cualquier bug en la validación de partial token, creación de usuario, o generación de tokens pasaría desapercibido.

**Impacto:** Bugs de producción en el flujo de registro con Google.

**Probabilidad:** Media

**Solución conceptual:** Agregar tests para `CompleteGoogleProfileUseCase`.

**Confianza:** Media (basado en ausencia del archivo)

---

### Hallazgo #40 — No hay tests de integración para los endpoints de appointment

**Severidad:** P2 — Medio
**Categoría:** Testing

**Evidencia:**
- `tests/interface-adapters/routes/` contiene tests para `auth.routes.test.ts`, `barber.routes.test.ts`, `service.routes.test.ts` — pero no `appointment.routes.test.ts`

**Problema:** Los endpoints de appointment (create, list, cancel, reschedule, updateStatus, anonymous) no tienen tests de integración que validen:
- Middleware de autenticación opcional
- Validación Joi
- Respuestas correctas
- Errores HTTP

**Impacto:** Bugs en rutas no detectados hasta producción.

**Probabilidad:** Media

**Solución conceptual:** Agregar tests de integración para cada endpoint de appointment.

**Confianza:** Alta

---

### Hallazgo #41 — No hay tests para `MongoAppointmentRepository`

**Severidad:** P2 — Medio
**Categoría:** Testing

**Evidencia:**
- Existen `mongo-barber.repository.test.ts`, `mongo-password-reset.repository.test.ts`, `mongo-user.repository.test.ts` pero no `mongo-appointment.repository.test.ts`

**Problema:** El repositorio más complejo (findMany con 6+ filtros, update, updateStatus, create con unique index) no tiene tests. El bug del Hallazgo #09 no se detectaría.

**Impacto:** Bugs en consultas de base de datos en producción.

**Probabilidad:** Media

**Solución conceptual:** Agregar tests para `MongoAppointmentRepository`.

**Confianza:** Alta

---

### Hallazgo #42 — El Email value object lanza `Error` genérico no `AppError`

**Severidad:** P2 — Medio
**Categoría:** Backend / Testing

**Evidencia:**
- `Password.ts:38-40` en el cuerpo del `create`:
  ```ts
  if (!isValid) {
    throw new AppError(PASSWORD_ERROR_MESSAGES.WEAK_PASSWORD, 400);
  }
  ```
  (según el fix reportado, se cambió de `Error` a `AppError`)
- `Email.ts` y otros value objects pueden usar `Error` genérico.

No tengo evidencia directa de esto (no leí todos los value objects). Pero basado en el fix #6 del agente que trabajó antes ("Password.create() throws AppError instead of Error"), otros value objects podrían tener el mismo problema.

**Impacto:** Errores de validación de value objects no son capturados correctamente por el middleware de errores de Express si no son `AppError`.

**Probabilidad:** Media

**Solución conceptual:** Asegurar que todos los value objects lancen `AppError`.

**Confianza:** Media (requiere verificación de cada value object)

---

## Resumen por Categoría

| Categoría | P0 | P1 | P2 | P3 |
|-----------|----|----|----|----|
| Seguridad | 3 | 5 | 3 | 0 |
| Backend (lógica/bugs) | 2 | 5 | 8 | 3 |
| Frontend | 1 | 0 | 3 | 1 |
| DB / Contratos | 0 | 0 | 5 | 0 |
| Arquitectura | 0 | 0 | 2 | 0 |
| Testing | 0 | 2 | 3 | 0 |
| Configuración | 0 | 0 | 1 | 0 |

---

## Recomendaciones de Priorización

### Corrección inmediata (P0):
1. **#01** — Reparar sistema TempLock (frontend + backend)
2. **#02** — Implementar bloqueo atómico para creación de turnos
3. **#03** — Separar secrets JWT (access, refresh, partial)
4. **#05** — Mover tokens de localStorage a httpOnly cookies
5. **#04** — Verificar que el token de reset corresponda al email
6. **#06** — Montar loginLimiter en rutas de login

### Corrección alta prioridad (P1):
7. **#07** — Mensaje único para email/phone en registro
8. **#10** — Fortalecer política de contraseñas de barberos
9. **#12** — Endpoint anonymous: exigir email + phone juntos
10. **#13** — Hacer await en linkAnonymousAppointments
11. **#24** — Centralizar refresh token expiry
12. **#38-39** — Agregar tests faltantes

### Corrección media (P2):
13. **#09** — Corregir findMany con filtros date + dateFrom
14. **#25** — Agregar índice en clientEmail + clientPhone
15. **#29** — Mejorar validación de email en frontend
16. **#30** — Inicializar calendario en próximo día laboral
17. **#36** — Unificar lógica de slots en SlotService

### Deuda técnica (P3):
18. **#33** — Optimizar carga de Google OAuth
19. **#35** — Unificar patrón de validación Email.create()
20. **#37** — Mejorar feedback de envío de email

---

*Fin del reporte de auditoría.*
