# Auditoría Backend ↔ Frontend — Oportunidades Funcionales

> **Fecha:** Julio 2026
> **Objetivo:** Identificar funcionalidades que podrían existir utilizando información, endpoints o capacidades que el backend ya ofrece pero que el frontend no aprovecha.
> **Premisa:** No se requieren cambios grandes en el backend. Todo lo propuesto reutiliza endpoints, datos, relaciones o cálculos existentes.

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Inventario del Backend](#2-inventario-del-backend)
3. [Drill Downs Faltantes](#3-drill-downs-faltantes)
4. [Navegaciones Faltantes](#4-navegaciones-faltantes)
5. [Datos del Backend Nunca Aprovechados](#5-datos-del-backend-nunca-aprovechados)
6. [Componentes Pasivos (Deben Ser Interactivos)](#6-componentes-pasivos-deben-ser-interactivos)
7. [Acciones Contextuales Faltantes](#7-acciones-contextuales-faltantes)
8. [Funcionalidades Incompletas](#8-funcionalidades-incompletas)
9. [Oportunidades de Reutilización del Backend](#9-oportunidades-de-reutilización-del-backend)
10. [Oportunidades de Filtros y Búsqueda](#10-oportunidades-de-filtros-y-búsqueda)
11. [Oportunidades de Dashboard](#11-oportunidades-de-dashboard)
12. [Acciones Masivas](#12-acciones-masivas)
13. [Catálogo Completo de Oportunidades](#13-catálogo-completo-de-oportunidades)
14. [Top 20 — Mejor Relación Impacto/Esfuerzo](#14-top-20--mejor-relación-impactoesfuerzo)
15. [Quick Wins](#15-quick-wins)
16. [Mapa de Navegación Propuesto](#16-mapa-de-navegación-propuesto)

---

## 1. Resumen Ejecutivo

Se identificaron **48 oportunidades funcionales** que el backend ya soporta pero el frontend no explota.

| Categoría | Cantidad |
|---|---|
| Drill Downs faltantes | 8 |
| Navegaciones faltantes | 7 |
| Datos backend no aprovechados | 15 |
| Componentes pasivos | 6 |
| Acciones contextuales faltantes | 5 |
| Funcionalidades incompletas | 5 |
| Oportunidades de reutilización | 2 |
| Oportunidades de dashboard | 8 |
| Acciones masivas | 4 |
| Filtros y búsqueda | 4 |

**Impacto potencial:** Muy alto. La mayoría son cambios de frontend que no requieren modificaciones en el backend.

---

## 2. Inventario del Backend

### 2.1 Endpoints existentes

#### Auth
| Endpoint | Método | Auth | Rol |
|---|---|---|---|
| `/api/auth/register` | POST | No | — |
| `/api/auth/google` | POST | No | — |
| `/api/auth/google/complete-profile` | POST | No | — |
| `/api/auth/refresh` | POST | No | — |
| `/api/auth/logout` | POST | No | — |
| `/api/auth/2fa/send` | POST | No | — |
| `/api/auth/2fa/verify` | POST | No | — |
| `/api/auth/request-reset` | POST | No | — |
| `/api/auth/reset-password` | POST | No | — |

#### Barbers
| Endpoint | Método | Auth | Rol |
|---|---|---|---|
| `/api/barbers/public` | GET | No | — |
| `/api/barbers/:id/slots` | GET | No | — |
| `/api/barbers` | GET | Sí | Cualquiera |
| `/api/barbers` | POST | Sí | Admin |
| `/api/barbers/:id` | GET | Sí | Self/Admin |
| `/api/barbers/:id` | PUT | Sí | Admin |
| `/api/barbers/:id/deactivate` | PATCH | Sí | Admin |
| `/api/barbers/:id` | DELETE | Sí | Admin |
| `/api/barbers/:id/schedule` | GET | Sí | Self/Admin |
| `/api/barbers/:id/schedule` | PUT | Sí | Admin |
| `/api/barbers/me` | PUT | Sí | Empleado/Admin |

#### Appointments
| Endpoint | Método | Auth | Rol |
|---|---|---|---|
| `/api/appointments` | POST | Opcional | — |
| `/api/appointments/anonymous` | GET | No (limitado) | — |
| `/api/appointments` | GET | Sí | Cualquiera |
| `/api/appointments/:id` | GET | Sí | Owner/Staff |
| `/api/appointments/:id/cancel` | PATCH | Sí | Cualquiera |
| `/api/appointments/:id/status` | PATCH | Sí | Admin/Empleado |
| `/api/appointments/:id/reschedule` | PATCH | Sí | Cualquiera |

#### Services
| Endpoint | Método | Auth | Rol |
|---|---|---|---|
| `/api/services` | GET | No | — |
| `/api/services?includeInactive&includeDeleted` | GET | Sí | Admin |
| `/api/services` | POST | Sí | Admin |
| `/api/services/:id` | PUT | Sí | Admin |
| `/api/services/:id` | DELETE | Sí | Admin |
| `/api/services/:id/restore` | PATCH | Sí | Admin |

#### TempLock
| Endpoint | Método | Auth | Rol |
|---|---|---|---|
| `/api/temp-locks` | POST | No | — |
| `/api/temp-locks/:tempLockId` | DELETE | No | — |

#### Users
| Endpoint | Método | Auth | Rol |
|---|---|---|---|
| `/api/users/me` | GET | Sí | Cualquiera |
| `/api/users/me` | PUT | Sí | Registrado |

#### Analytics (Admin)
| Endpoint | Método |
|---|---|
| `/api/analytics/overview` | GET |
| `/api/analytics/heatmap` | GET |
| `/api/analytics/charts/distribucion` | GET |
| `/api/analytics/charts/reservas-ganancias` | GET |
| `/api/analytics/years` | GET |

### 2.2 Entidades y sus datos completos

#### Appointment
```
id, barberId, clientId, clientName, clientLastname, clientPhone, clientEmail
serviceId, serviceName, servicePrice, serviceDuration
date, startTime, endTime
status (Confirmado|Completado|Cancelado|NoShow)
paymentStatus (Pendiente|Pagado)
paymentMethod (local|online|memberPass)
cancelReason, cancelledAt, cancelledBy
createdBy { type (staff|registered|anonymous), userId }
statusHistory [{ status, timestamp, actor }]
createdAt, updatedAt
```

#### Barber
```
id, email, name, lastname, phone
kind (Admin|Empleado), services[], age, photoUrl
isActive, slotDuration, maxAdvanceDays
schedule: { day: { startTime, endTime, breaks[{startTime,endTime}] } }
```

#### User
```
id, email, name, lastname, phone, kind
authProvider (local|google), passwordHash, googleId
twoFactor { codeHash, expiresAt }
lastLoginAt, twoFactorFailedAttempts, twoFactorLockedUntil
resetFailedAttempts, resetLockedUntil, photoUrl
```

#### Service
```
id, name, description, price, imageUrl, status (active|inactive|deleted)
```

#### Client
```
id, name, lastname, phone, contactEmail, kind (Registrado|NoRegistrado)
```

---

## 3. Drill Downs Faltantes

### O-01. Heatmap → Día → Reservas del día

| Campo | Detalle |
|---|---|
| **Oportunidad** | El heatmap anual muestra un mapa de calor con la cantidad de reservas por día. Actualmente solo muestra un tooltip al hacer hover. Debería permitir click → abrir modal con lista de reservas de ese día |
| **Evidencia** | `GET /api/analytics/heatmap` devuelve `{fecha, cantidad}`. `GET /api/appointments?date=YYYY-MM-DD` devuelve las reservas de ese día. Ambos endpoints existen y funcionan |
| **Situación actual** | Hover → tooltip con fecha y cantidad. No hay click |
| **Propuesta** | Click en celda del heatmap → modal con las reservas del día (similar al DayDetailModal del calendario) |
| **Valor** | Pasar de "veo un color" a "veo las reservas concretas" sin cambiar de pantalla |
| **Complejidad** | Baja |
| **Impacto** | Alto |

---

### O-02. KPI Cards → Lista filtrada

| Campo | Detalle |
|---|---|
| **Oportunidad** | Las 4 KPI cards (Reservas, Duración, Ingresos, Nuevos clientes) son estáticas. Click en cada una debería navegar a la lista de turnos filtrada por ese criterio |
| **Evidencia** | Overview devuelve `totalReservas`, `duracionTotalMinutos`, `ingresosTotales`, `nuevosClientes`. `GET /api/appointments` acepta filtros por fecha, estado, barberId, clientId |
| **Situación actual** | Cards puramente informativas, sin interacción |
| **Propuesta** | "Reservas" → navega a AppointmentsPage. "Ingresos" → abre detalle de ingresos. "Nuevos clientes" → abre lista de nuevos clientes en el período |
| **Valor** | Navegación con un click desde métricas al detalle operativo |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-03. StatusBreakdown → Turnos filtrados por estado

| Campo | Detalle |
|---|---|
| **Oportunidad** | El desglose de estados muestra 4 números. Click en cada uno debería llevar a la lista de turnos con ese estado |
| **Evidencia** | `estadisticasPorEstado` en overview. `GET /api/appointments?status=X` |
| **Situación actual** | Números estáticos, sin click |
| **Propuesta** | Cada fila clickeable → AppointmentsPage con filtro de ese estado aplicado |
| **Valor** | Identificar visualmente un problema (ej. muchos cancelados) y ver los detalles inmediatamente |
| **Complejidad** | Baja |
| **Impacto** | Alto |

---

### O-04. Distribución Donut → Turnos por barbero

| Campo | Detalle |
|---|---|
| **Oportunidad** | El gráfico de donut muestra distribución por barbero. Click en un segmento debería filtrar la lista de turnos por ese barbero |
| **Evidencia** | `GET /api/analytics/charts/distribucion` devuelve `{barberId, nombre, cantidad, ingresos}`. `GET /api/appointments?barberId=X` |
| **Situación actual** | Solo muestra datos. No hay interacción |
| **Propuesta** | Click en segmento → AppointmentsPage con filtro barberId. También abrir perfil del barbero |
| **Valor** | Pasar de "veo la proporción" a "veo los turnos de ese barbero" |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-05. Reserve/Ganancias Chart → Lista de turnos del período

| Campo | Detalle |
|---|---|
| **Oportunidad** | Cada barra/punto en los charts de reservas y ganancias representa un período. Click debería mostrar los turnos de ese período |
| **Evidencia** | `GET /api/analytics/charts/reservas-ganancias` devuelve `{periodo, cantidadReservas, ganancias}` |
| **Situación actual** | Charts no interactivos (solo tooltip) |
| **Propuesta** | Click en barra → mostrar tooltip expandido con opción "Ver turnos" → AppointmentsPage filtrada por ese período |
| **Valor** | Poder auditar qué turnos generaron esos números |
| **Complejidad** | Media |
| **Impacto** | Alto |

---

### O-06. Calendar DayCard → Turno individual

| Campo | Detalle |
|---|---|
| **Oportunidad** | En la vista de calendario, la DayCard muestra el primer turno del día. Ese turno debería ser clickeable para abrir su detalle o acciones |
| **Evidencia** | DayCard tiene datos del `first` appointment. `GET /api/appointments/:id` |
| **Situación actual** | La DayCard solo muestra el primer turno. No se puede hacer click en él. Solo existe el botón "+N más" |
| **Propuesta** | Click en el turno mostrado → abre modal con detalle y acciones (completar, cancelar, etc.) |
| **Valor** | Acceder rápidamente a las acciones de un turno desde el calendario |
| **Complejidad** | Baja |
| **Impacto** | Alto |

---

### O-07. Tabla de turnos → Fila expandible con detalle completo

| Campo | Detalle |
|---|---|
| **Oportunidad** | Cada fila de la tabla de turnos puede expandirse para mostrar información detallada: historial de estados, método de pago, quién creó el turno, etc. |
| **Evidencia** | `GET /api/appointments/:id` devuelve todos los campos: `statusHistory`, `createdBy`, `paymentStatus`, `paymentMethod`, `cancelledAt`, `cancelledBy` |
| **Situación actual** | La tabla muestra datos básicos en columnas. No hay detalle expandible |
| **Propuesta** | Click en fila o botón "expandir" → fila expandida con tarjeta de detalle completo incluyendo historial, pago, origen |
| **Valor** | Ver toda la información del turno sin salir de la lista |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-08. Profesional card → Expandir horarios

| Campo | Detalle |
|---|---|
| **Oportunidad** | Cada card de profesional en la lista podría expandirse para mostrar su horario semanal sin abrir el modal de edición |
| **Evidencia** | `GET /api/barbers/:id/schedule` devuelve el schedule completo. La entidad `Professional` ya contiene `schedule` |
| **Situación actual** | La card muestra datos básicos. No hay forma de ver el horario sin abrir el modal de edición |
| **Propuesta** | Botón/icono para expandir la card y mostrar la tabla de horarios (ej: Lun 09-18, Mar 09-18...) |
| **Valor** | Ver rápidamente la disponibilidad de un barbero sin abrir modales |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

## 4. Navegaciones Faltantes

### O-09. Barbero → Perfil del barbero

| Campo | Detalle |
|---|---|
| **Oportunidad** | En cualquier lugar donde aparezca el nombre de un barbero, debería ser clickeable para navegar a su perfil/detalle |
| **Evidencia** | `GET /api/barbers/:id` devuelve datos completos |
| **Situación actual** | En AppointmentsPage, CalendarPage, Dashboard: el nombre del barbero es texto plano |
| **Propuesta** | Convertir nombres de barbero en links `<Link>` a la ruta `/admin/profesionales/:id` o abrir un modal de detalle |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-10. Servicio → Detalle del servicio

| Campo | Detalle |
|---|---|
| **Oportunidad** | En la tabla de turnos, el nombre del servicio debería ser clickeable para ver su detalle |
| **Evidencia** | `GET /api/services` o `PUT /api/services/:id` |
| **Situación actual** | Texto plano en la tabla |
| **Propuesta** | Link al detalle del servicio o modal con info (precio, descripción, duración, imagen) |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-11. Cliente → Historial del cliente

| Campo | Detalle |
|---|---|
| **Oportunidad** | En la tabla de turnos (admin), el nombre del cliente debería ser clickeable para ver su historial completo de visitas |
| **Evidencia** | `GET /api/appointments?clientEmail=X&clientPhone=Y` o `GET /api/appointments?clientId=X` |
| **Situación actual** | El nombre del cliente es texto plano. No hay forma de ver el historial de un cliente |
| **Propuesta** | Click en cliente → modal con historial completo de turnos (fechas, servicios, barberos, montos gastados) |
| **Valor** | Un barbero puede ver si un cliente es recurrente, qué servicios prefiere, etc. |
| **Complejidad** | Media |
| **Impacto** | Muy alto |

---

### O-12. Turno → Cliente sin cuenta → "Buscar mis turnos"

| Campo | Detalle |
|---|---|
| **Oportunidad** | Los usuarios anónimos (sin cuenta) no pueden consultar sus turnos después de reservar. El endpoint `GET /api/appointments/anonymous` existe pero no hay UI |
| **Evidencia** | `GET /api/appointments/anonymous?email=X&phone=Y` endpoint funcional con rate limiting |
| **Situación actual** | No existe ninguna pantalla para que un cliente anónimo busque sus turnos |
| **Propuesta** | Nueva ruta `/buscar-turno` con formulario (email + teléfono) que muestre los turnos de ese contacto. Similar a "Find my booking" de aerolíneas |
| **Valor** | Los clientes que reservan sin registro pueden consultar/modificar sus turnos |
| **Complejidad** | Media |
| **Impacto** | Muy alto |

---

### O-13. Dashboard → Calendario

| Campo | Detalle |
|---|---|
| **Oportunidad** | Desde las métricas del dashboard, debería haber un link directo al calendario |
| **Evidencia** | Rutas existentes: `/admin/dashboard` y `/admin/calendario` |
| **Situación actual** | No hay navegación contextual entre dashboard y calendario |
| **Propuesta** | Agregar botón "Ver calendario" en la sección de tendencia del dashboard |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-14. Landing → Reservar

| Campo | Detalle |
|---|---|
| **Oportunidad** | La landing page tiene un hero pero podría tener acceso directo a los profesionales y servicios |
| **Evidencia** | `GET /api/barbers/public` y `GET /api/services` |
| **Situación actual** | Landing es puramente estática |
| **Propuesta** | Mostrar barberos activos y servicios destacados en la landing con CTA directo a reservar con ese barbero/servicio |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-15. Calendario → Crear turno desde día vacío

| Campo | Detalle |
|---|---|
| **Oportunidad** | En el calendario, si un día no tiene turnos, debería poder crearse un turno para ese día directamente |
| **Evidencia** | `POST /api/appointments` y `POST /api/temp-locks` |
| **Situación actual** | No hay forma de crear un turno desde el calendario. Hay que ir al booking flow |
| **Propuesta** | Click en día vacío → modal rápido de creación de turno (cliente, servicio, hora) |
| **Valor** | Los administradores pueden agendar turnos telefónicos directamente desde el calendario |
| **Complejidad** | Media |
| **Impacto** | Alto |

---

## 5. Datos del Backend Nunca Aprovechados

### O-16. `statusHistory` — Historial de cambios de estado

| Campo | Detalle |
|---|---|
| **Qué contiene** | Array de `{status, timestamp, actor}` — cada vez que cambia el estado del turno se registra quién y cuándo |
| **Situación actual** | Nunca se muestra en el frontend |
| **Propuesta** | Mostrarlo como timeline en el detalle del turno: "15/06 10:00 → Completado por Admin", "15/06 09:30 → Confirmado por sistema" |
| **Valor** | Auditoría y trazabilidad. Saber exactamente cuándo y quién cambió cada estado |
| **Complejidad** | Baja |
| **Impacto** | Alto |

---

### O-17. `createdBy` — Origen de la reserva

| Campo | Detalle |
|---|---|
| **Qué contiene** | `{type: 'staff'|'registered'|'anonymous', userId}` |
| **Situación actual** | Nunca se muestra |
| **Propuesta** | Badge o texto: "Reserva online", "Creado por admin", "Reserva registrada". Filtrable en la tabla |
| **Valor** | Saber si el turno fue creado por el cliente online o por un administrador |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-18. `paymentStatus` y `paymentMethod` — Estado y método de pago

| Campo | Detalle |
|---|---|
| **Qué contiene** | `paymentStatus: 'Pendiente'|'Pagado'`, `paymentMethod: 'local'|'online'|'memberPass'` |
| **Situación actual** | Se guardan en la DB pero nunca se muestran en el frontend (ni en tabla, ni en detalle) |
| **Propuesta** | Columna "Pago" en la tabla con badge (Pagado/Pendiente). Filtro por paymentStatus. Dashboard con método de pago |
| **Valor** | Control financiero básico. Saber qué turnos están pendientes de pago |
| **Complejidad** | Baja |
| **Impacto** | Muy alto |

---

### O-19. `cancelledAt` y `cancelledBy` — Quién y cuándo canceló

| Campo | Detalle |
|---|---|
| **Qué contiene** | Fecha y actor de la cancelación |
| **Situación actual** | Solo se muestra `cancelReason` (motivo) cuando existe |
| **Propuesta** | En turnos cancelados mostrar: "Cancelado por Admin el 15/06 a las 14:30 — Motivo: X" |
| **Valor** | Transparencia y auditoría |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-20. `serviceDuration` — Duración del servicio

| Campo | Detalle |
|---|---|
| **Qué contiene** | `number` — duración en minutos del servicio en cada turno |
| **Situación actual** | No se muestra en la tabla de turnos ni en cards |
| **Propuesta** | Mostrar duración junto al servicio: "Corte de pelo (45 min)" |
| **Valor** | El admin y el cliente saben cuánto dura el turno |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-21. `endTime` — Hora de fin del turno

| Campo | Detalle |
|---|---|
| **Qué contiene** | `string` — hora de finalización |
| **Situación actual** | No se muestra en MyAppointmentsPage ni en la tabla principal de AdminAppointmentsPage. Solo se muestra en DayDetailModal |
| **Propuesta** | Mostrar rango completo "14:00 - 14:45" donde hoy solo se ve "14:00" |
| **Valor** | Claridad sobre la duración del turno |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-22. `age` del barbero

| Campo | Detalle |
|---|---|
| **Qué contiene** | Edad del barbero (opcional) |
| **Situación actual** | Se guarda pero no se muestra en ningún lado |
| **Propuesta** | Mostrar en la card del profesional si está disponible |
| **Valor** | Información adicional del profesional |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-23. `maxAdvanceDays` del barbero

| Campo | Detalle |
|---|---|
| **Qué contiene** | Días máximos de anticipación para reservar |
| **Situación actual** | Solo se usa en el backend para validación. No se muestra al usuario |
| **Propuesta** | Mostrar en el perfil del barbero y/o en el paso de selección de fecha: "Podés reservar con hasta 30 días de anticipación" |
| **Valor** | Transparencia con el cliente |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-24. `breaks` del horario del barbero

| Campo | Detalle |
|---|---|
| **Qué contiene** | Array de `{startTime, endTime}` por día |
| **Situación actual** | Se pueden configurar los breaks pero no se muestran en ningún resumen |
| **Propuesta** | En el resumen del horario mostrar breaks: "Lun 09-18 (break 13-14)" |
| **Valor** | Claridad sobre la disponibilidad real |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-25. `lastLoginAt` — Último acceso del usuario

| Campo | Detalle |
|---|---|
| **Qué contiene** | Fecha del último login |
| **Situación actual** | No se muestra al usuario |
| **Propuesta** | En el perfil: "Último acceso: 20/06/2026 15:30" |
| **Valor** | Seguridad y transparencia |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-26. `photoUrl` en perfil de usuario registrado

| Campo | Detalle |
|---|---|
| **Qué contiene** | URL de foto del usuario |
| **Situación actual** | Solo se usa para barberos. Para usuarios registrados (clientes) no se muestra |
| **Propuesta** | Mostrar avatar del cliente en su perfil y en sus turnos |
| **Valor** | Personalización |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-27. `kind` del cliente (Registrado vs NoRegistrado)

| Campo | Detalle |
|---|---|
| **Qué contiene** | Si el cliente tiene cuenta o no |
| **Situación actual** | En la DB de clientes se guarda pero no se expone en el frontend |
| **Propuesta** | Badge en el turno: "Cliente registrado" o "Cliente anónimo" |
| **Valor** | El admin sabe si el cliente tiene cuenta |
| **Complejidad** | Baja |
| **Impacto** | Bajo |

---

### O-28. `serviceId` no vinculado al catálogo de servicios en turnos

| Campo | Detalle |
|---|---|
| **Qué contiene** | El serviceId se guarda como string, no como ObjectId referenciado |
| **Situación actual** | No se puede navegar del turno al servicio porque no hay relación de DB (solo string) |
| **Propuesta** | A futuro: referenciar servicios reales. Mientras tanto, al menos mostrar el `serviceName` como link |
| **Complejidad** | Alta (requiere cambio de modelo) |
| **Impacto** | Medio |

---

### O-29. `ResetFailedAttempts` / `ResetLockedUntil` no expuestos

| Campo | Detalle |
|---|---|
| **Qué contiene** | Intentos fallidos de reseteo de contraseña |
| **Situación actual** | Backend lo procesa, frontend no lo muestra |
| **Propuesta** | Mostrar mensajes como "Demasiados intentos. Intentá de nuevo en 15 minutos" |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-30. `twoFactor` configurado en backend, sin UI

| Campo | Detalle |
|---|---|
| **Qué contiene** | El backend soporta 2FA (send code, verify code) |
| **Situación actual** | Los endpoints existen y funcionan. No hay UI para habilitar/deshabilitar 2FA ni para el flujo completo de login 2FA |
| **Propuesta** | Agregar sección "Seguridad" en el perfil con toggle para 2FA y el flujo de verificación |
| **Valor** | Seguridad del usuario |
| **Complejidad** | Alta |
| **Impacto** | Medio |

---

## 6. Componentes Pasivos (Deben Ser Interactivos)

### O-31. KpiCards → Click navegable

| Detalle |
|---|
| 4 cards numéricas. Click → navegar a listado filtrado. Cada card debe ser un link/botón |
| **Esfuerzo:** Bajo |
| **Impacto:** Medio |

### O-32. StatusBreakdown → Click en estado → AppointmentsPage con filtro

| Detalle |
|---|
| 4 filas de estado. Click → navegar a /admin/turnos?status=X |
| **Esfuerzo:** Bajo |
| **Impacto:** Alto |

### O-33. Heatmap → Click en celda → Modal con turnos del día

| Detalle |
|---|
| Celda clickeable del heatmap anual. Click → modal con lista de reservas de ese día (reutilizar DayDetailModal) |
| **Esfuerzo:** Medio |
| **Impacto:** Alto |

### O-34. Chart de reservas/ganancias → Click en barra → Lista de turnos

| Detalle |
|---|
| Las barras del gráfico deben ser clickeables para ver los turnos de ese período |
| **Esfuerzo:** Medio |
| **Impacto:** Alto |

### O-35. Distribución (Donut) → Click en segmento → Filtro por barbero

| Detalle |
|---|
| Cada segmento del donut debe ser clickeable para navegar a /admin/turnos?barberId=X |
| **Esfuerzo:** Bajo |
| **Impacto:** Medio |

### O-36. StatsCards en AppointmentsPage → Click → filtro automático

| Detalle |
|---|
| Las 4 cards (Total, Confirmados, Completados, Cancelados) al inicio de la página de turnos. Click debería aplicar el filtro de estado correspondiente |
| **Esfuerzo:** Bajo |
| **Impacto:** Medio |

---

## 7. Acciones Contextuales Faltantes

### O-37. Marcar pago como "Pagado" sin completar turno

| Campo | Detalle |
|---|---|
| **Evidencia** | `PATCH /api/appointments/:id/status` permite enviar `paymentStatus: 'Pagado'`. El `UpdateAppointmentStatusUseCase` lo soporta |
| **Situación actual** | Solo se puede marcar pagado al completar el turno. No hay acción separada de pago |
| **Propuesta** | Botón "Marcar pagado" en el menú de acciones del turno (independiente del estado) |
| **Valor** | Registrar pagos anticipados o pagos en el momento sin completar el servicio |
| **Complejidad** | Baja |
| **Impacto** | Alto |

---

### O-38. Duplicar turno

| Campo | Detalle |
|---|---|
| **Evidencia** | `POST /api/appointments` con datos del turno existente |
| **Situación actual** | No hay forma de crear un turno similar a uno existente |
| **Propuesta** | Opción "Duplicar turno" en el menú contextual → precarga el formulario de creación con los mismos datos |
| **Valor** | Agilizar la creación de turnos recurrentes para el mismo cliente |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-39. Crear turno como admin desde cualquier pantalla

| Campo | Detalle |
|---|---|
| **Evidencia** | `POST /api/appointments` permite crear turnos con `createdBy: {type: 'staff'}` |
| **Situación actual** | El admin solo puede crear turnos desde el booking flow público o no tiene acceso directo |
| **Propuesta** | Botón flotante "+ Nuevo turno" en todas las pantallas admin que abra un modal rápido de creación |
| **Valor** | Los administradores pueden agendar turnos telefónicos/presenciales rápidamente |
| **Complejidad** | Media |
| **Impacto** | Muy alto |

---

### O-40. Compartir turno

| Campo | Detalle |
|---|---|
| **Evidencia** | `GET /api/appointments/:id` |
| **Situación actual** | No hay forma de compartir los detalles de un turno |
| **Propuesta** | Botón "Compartir" → copia enlace/resumen del turno al portapapeles o abre WhatsApp/email con los datos |
| **Valor** | Un cliente puede compartir su turno con un familiar o recordárselo a sí mismo |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

### O-41. Enviar recordatorio por email

| Campo | Detalle |
|---|---|
| **Evidencia** | El backend ya usa `IEmailService` para notificaciones de completado y NoShow |
| **Situación actual** | No hay acción manual para reenviar confirmación/recordatorio |
| **Propuesta** | Botón "Enviar recordatorio" en el menú de acciones del turno → envía email al cliente con los datos del turno |
| **Valor** | Reducir NoShows recordando al cliente su turno |
| **Complejidad** | Media |
| **Impacto** | Alto |

---

## 8. Funcionalidades Incompletas

### O-42. Autenticación de dos factores (2FA) sin interfaz

| Campo | Detalle |
|---|---|
| **Evidencia** | Backend: `POST /api/auth/2fa/send`, `POST /api/auth/2fa/verify`, `TwoFactorController`, `User.twoFactor` |
| **Situación actual** | No hay UI para el flujo de 2FA. El backend soporta enviar código y verificarlo pero el frontend nunca lo pide |
| **Propuesta** | Implementar pantalla de verificación 2FA después del login. Agregar toggle en perfil para activar/desactivar |
| **Valor** | Seguridad de cuentas |
| **Complejidad** | Alta |
| **Impacto** | Medio |

---

### O-43. Google Sign-In sin finalización de perfil

| Campo | Detalle |
|---|---|
| **Evidencia** | `POST /api/auth/google/complete-profile` endpoint existe |
| **Situación actual** | El flujo de Google Sign-In puede dejar al usuario sin datos de perfil completos (teléfono, etc.) |
| **Propuesta** | Después del login con Google, si falta teléfono o nombre, redirigir a pantalla de completar perfil |
| **Valor** | Datos de usuario completos |
| **Complejidad** | Media |
| **Impacto** | Medio |

---

### O-44. Booking anónimo sin forma de consulta posterior

| Campo | Detalle |
|---|---|
| **Evidencia** | `GET /api/appointments/anonymous` endpoint funcional |
| **Situación actual** | El cliente que reserva sin cuenta no puede consultar sus turnos después. No hay pantalla "Buscar mis turnos" |
| **Propuesta** | Ruta `/buscar-turno` con formulario email/teléfono que muestre los turnos del cliente. Acciones: cancelar, reprogramar |
| **Valor** | Equidad funcional entre usuarios registrados y anónimos |
| **Complejidad** | Media |
| **Impacto** | Muy alto |

---

### O-45. Sin forma de ver historial de cambios en turnos

| Campo | Detalle |
|---|---|
| **Evidencia** | `appointment.statusHistory` tiene todo el historial |
| **Situación actual** | No se muestra nunca |
| **Propuesta** | Sección "Historial de cambios" en el detalle del turno con timeline |
| **Valor** | Trazabilidad completa |
| **Complejidad** | Baja |
| **Impacto** | Alto |

---

### O-46. Admin no puede cambiar barbero de un turno sin reprogramar

| Campo | Detalle |
|---|---|
| **Evidencia** | El `reschedule` permite cambiar barberId |
| **Situación actual** | Para cambiar el barbero hay que usar "Reprogramar" que también pide fecha y hora |
| **Propuesta** | Acción separada "Cambiar barbero" que solo cambie el barbero asignado manteniendo fecha y hora |
| **Valor** | Reasignación rápida de turnos |
| **Complejidad** | Media (requiere endpoint nuevo) |
| **Impacto** | Medio |

---

## 9. Oportunidades de Reutilización del Backend

### O-47. Reutilizar `getAppointments()` del dashboard para otras visualizaciones

| Campo | Detalle |
|---|---|
| **Evidencia** | `GET /api/appointments` con filtros `dateFrom`, `dateTo`, `barberId`, `serviceId`, `status` |
| **Situación actual** | Se usa para la tabla de turnos y calendario. Pero no se usa para generar insights adicionales |
| **Propuesta** | Reutilizar el mismo endpoint para: análisis por hora del día, día de la semana, tendencias por servicio, cliente frecuente |
| **Valor** | Sin nuevo backend, nuevas visualizaciones |
| **Complejidad** | Media |
| **Impacto** | Alto |

---

### O-48. Reutilizar `getOverview` para resumen semanal/rápido

| Campo | Detalle |
|---|---|
| **Evidencia** | Overview acepta `preset: 'hoy'|'ayer'|'semana'|'mes'|'year'` pero el frontend nunca usa los presets, solo fechas manuales |
| **Situación actual** | DateRangeFilter obliga a seleccionar fechas manualmente |
| **Propuesta** | Agregar botones de acceso rápido: "Hoy", "Esta semana", "Este mes" que usen los presets del backend |
| **Valor** | Métricas con un solo click |
| **Complejidad** | Baja |
| **Impacto** | Medio |

---

## 10. Oportunidades de Filtros y Búsqueda

### O-49. Filtro por método de pago en AppointmentsPage

| Evidencia | `paymentMethod` se almacena en cada turno. Backend soporta filtrado |
|---|---|
| **Propuesta** | Select "Método de pago" en los filtros de la tabla de turnos |
| **Complejidad** | Baja | **Impacto** | Medio |

### O-50. Filtro por rango de fechas en AppointmentsPage

| Evidencia | Backend acepta `dateFrom` y `dateTo`. El frontend solo tiene filtro de fecha exacta |
|---|---|
| **Propuesta** | Reemplazar filtro de fecha única por rango de fechas (dateFrom/dateTo) o agregar DateRangeFilter |
| **Complejidad** | Baja | **Impacto** | Alto |

### O-51. Búsqueda en profesionales con backend (hoy es local)

| Evidencia | Backend no tiene endpoint de búsqueda de barberos. La búsqueda en el frontend es 100% local sobre los datos ya cargados |
|---|---|
| **Propuesta** | Agregar query param `search` al `GET /api/barbers` para búsqueda server-side |
| **Complejidad** | Baja (backend) | **Impacto** | Medio |

### O-52. Ordenamiento por precio/estado en ServicesPage

| Evidencia | La tabla de servicios no permite ordenar por columnas |
|---|---|
| **Propuesta** | Headers de columna clickeables para orden ascendente/descendente |
| **Complejidad** | Baja | **Impacto** | Bajo |

---

## 11. Oportunidades de Dashboard

### O-53. Análisis por hora del día

| Evidencia | `startTime` está disponible en cada turno |
|---|---|
| **Propuesta** | Gráfico de barras mostrando distribución de turnos por hora (más horarios populares) |
| **Complejidad** | Media | **Impacto** | Alto |

### O-54. Análisis por día de la semana

| Evidencia | `date` contiene el día de la semana |
|---|---|
| **Propuesta** | Gráfico mostrando qué días de la semana tienen más demanda |
| **Complejidad** | Media | **Impacto** | Alto |

### O-55. Ticket promedio por barbero

| Evidencia | `ingresos / cantidad` se puede calcular de `getDistribucion()` |
|---|---|
| **Propuesta** | Nueva KPI o columna en distribución mostrando ticket promedio |
| **Complejidad** | Baja | **Impacto** | Medio |

### O-56. Tasa de cancelación y NoShow

| Evidencia | `estadisticasPorEstado` del overview devuelve cancelados y noshow |
|---|---|
| **Propuesta** | Indicador: "Tasa de cancelación: 12%" con trend |
| **Complejidad** | Baja | **Impacto** | Medio |

### O-57. Tasa de retorno de clientes

| Evidencia | `nuevosClientes` vs `totalReservas` permite calcular clientes recurrentes |
|---|---|
| **Propuesta** | "X% de clientes recurrentes" — mostrar lealtad |
| **Complejidad** | Media | **Impacto** | Alto |

### O-58. Comparativa barberos (side-by-side)

| Evidencia | `getDistribucion()` devuelve datos por barbero |
|---|---|
| **Propuesta** | Tabla comparativa con columnas: nombre, turnos, ingresos, ticket promedio, NoShows |
| **Complejidad** | Baja | **Impacto** | Medio |

### O-59. Revenue tracking por servicio

| Evidencia | `GET /api/analytics/charts/reservas-ganancias` acepta `serviceId` como filtro pero no hay visualización comparativa |
|---|---|
| **Propuesta** | Gráfico de barras: ingresos por servicio en el período |
| **Complejidad** | Baja | **Impacto** | Alto |

### O-60. Proyección de ingresos basada en turnos confirmados

| Evidencia | Turnos confirmados tienen `servicePrice`. Se pueden sumar para estimar ingresos futuros |
|---|---|
| **Propuesta** | KPI "Ingresos proyectados" = suma de precios de turnos Confirmados en el período + futuros |
| **Complejidad** | Baja | **Impacto** | Medio |

---

## 12. Acciones Masivas

### O-61. Exportar turnos a CSV

| Evidencia | Todos los datos existen en el listado de turnos |
|---|---|
| **Propuesta** | Botón "Exportar CSV" en AppointmentsPage que descargue los turnos actualmente filtrados |
| **Complejidad** | Media | **Impacto** | Alto |

### O-62. Cancelación masiva de turnos

| Evidencia | `PATCH /api/appointments/:id/cancel` individual |
|---|---|
| **Propuesta** | Checkboxes en tabla + botón "Cancelar seleccionados" con modal de confirmación y motivo común |
| **Complejidad** | Alta | **Impacto** | Medio |

### O-63. Cambio de estado masivo

| Evidencia | `PATCH /api/appointments/:id/status` individual |
|---|---|
| **Propuesta** | Seleccionar múltiples turnos y marcarlos como Completado/NoShow |
| **Complejidad** | Alta | **Impacto** | Medio |

### O-64. Exportar dashboard a PDF

| Evidencia | Datos de dashboard disponibles |
|---|---|
| **Propuesta** | Botón "Exportar reporte PDF" en dashboard |
| **Complejidad** | Alta | **Impacto** | Medio |

---

## 13. Catálogo Completo de Oportunidades

| # | Oportunidad | Categoría | Complejidad | Impacto |
|---|---|---|---|---|
| O-01 | Heatmap → click → reservas del día | Drill Down | Baja | Alto |
| O-02 | KPIs click → lista filtrada | Drill Down | Baja | Medio |
| O-03 | StatusBreakdown click → turnos por estado | Drill Down | Baja | Alto |
| O-04 | Donut click → turnos por barbero | Drill Down | Baja | Medio |
| O-05 | Charts click → turnos del período | Drill Down | Media | Alto |
| O-06 | DayCard turno click → detalle/acciones | Drill Down | Baja | Alto |
| O-07 | Fila expandible con detalle completo | Drill Down | Baja | Medio |
| O-08 | Profesional card expandir horarios | Drill Down | Baja | Medio |
| O-09 | Barbero nombre → perfil | Navegación | Baja | Medio |
| O-10 | Servicio nombre → detalle | Navegación | Baja | Bajo |
| O-11 | Cliente nombre → historial completo | Navegación | Media | Muy alto |
| O-12 | Cliente anónimo → buscar mis turnos | Navegación | Media | Muy alto |
| O-13 | Dashboard → Calendario link | Navegación | Baja | Bajo |
| O-14 | Landing → barberos/servicios destacados | Navegación | Baja | Medio |
| O-15 | Calendario día vacío → crear turno | Navegación | Media | Alto |
| O-16 | statusHistory nunca mostrado | Dato no usado | Baja | Alto |
| O-17 | createdBy nunca mostrado | Dato no usado | Baja | Medio |
| O-18 | paymentStatus y paymentMethod ocultos | Dato no usado | Baja | Muy alto |
| O-19 | cancelledAt/cancelledBy ocultos | Dato no usado | Baja | Medio |
| O-20 | serviceDuration no mostrado | Dato no usado | Baja | Bajo |
| O-21 | endTime no mostrado | Dato no usado | Baja | Bajo |
| O-22 | age del barbero no mostrado | Dato no usado | Baja | Bajo |
| O-23 | maxAdvanceDays no mostrado | Dato no usado | Baja | Bajo |
| O-24 | breaks del horario no mostrado | Dato no usado | Baja | Bajo |
| O-25 | lastLoginAt no mostrado | Dato no usado | Baja | Medio |
| O-26 | photoUrl cliente no mostrado | Dato no usado | Baja | Bajo |
| O-27 | kind del cliente no mostrado | Dato no usado | Baja | Bajo |
| O-28 | serviceId sin relación real | Dato no usado | Alta | Medio |
| O-29 | ResetFailedAttempts no mostrado | Dato no usado | Baja | Medio |
| O-30 | 2FA sin UI | Funcionalidad incompleta | Alta | Medio |
| O-31 | KpiCards → interactivo | Componente pasivo | Baja | Medio |
| O-32 | StatusBreakdown → interactivo | Componente pasivo | Baja | Alto |
| O-33 | Heatmap → interactivo | Componente pasivo | Medio | Alto |
| O-34 | Charts → interactivo | Componente pasivo | Medio | Alto |
| O-35 | Donut → interactivo | Componente pasivo | Baja | Medio |
| O-36 | StatsCards → filtro automático | Componente pasivo | Baja | Medio |
| O-37 | Marcar pagado sin completar | Acción faltante | Baja | Alto |
| O-38 | Duplicar turno | Acción faltante | Baja | Medio |
| O-39 | Crear turno como admin rápido | Acción faltante | Media | Muy alto |
| O-40 | Compartir turno | Acción faltante | Baja | Medio |
| O-41 | Enviar recordatorio email | Acción faltante | Media | Alto |
| O-42 | 2FA sin UI | Funcionalidad incompleta | Alta | Medio |
| O-43 | Google Sign-In perfil incompleto | Funcionalidad incompleta | Media | Medio |
| O-44 | Booking anónimo sin consulta | Funcionalidad incompleta | Media | Muy alto |
| O-45 | Sin historial de cambios | Funcionalidad incompleta | Baja | Alto |
| O-46 | Cambiar barbero sin reprogramar | Acción faltante | Media | Medio |
| O-47 | Reutilizar appointments para insights | Reutilización | Media | Alto |
| O-48 | Presets de fechas en dashboard | Reutilización | Baja | Medio |
| O-49 | Filtro paymentMethod | Filtro | Baja | Medio |
| O-50 | Filtro rango fechas en turnos | Filtro | Baja | Alto |
| O-51 | Búsqueda server-side profesionales | Filtro | Baja | Medio |
| O-52 | Ordenamiento servicios | Filtro | Baja | Bajo |
| O-53 | Análisis por hora del día | Dashboard | Media | Alto |
| O-54 | Análisis por día de semana | Dashboard | Media | Alto |
| O-55 | Ticket promedio por barbero | Dashboard | Baja | Medio |
| O-56 | Tasa cancelación/NoShow | Dashboard | Baja | Medio |
| O-57 | Tasa retorno clientes | Dashboard | Media | Alto |
| O-58 | Comparativa barberos | Dashboard | Baja | Medio |
| O-59 | Revenue por servicio | Dashboard | Baja | Alto |
| O-60 | Proyección ingresos | Dashboard | Baja | Medio |
| O-61 | Exportar turnos CSV | Acción masiva | Media | Alto |
| O-62 | Cancelación masiva | Acción masiva | Alta | Medio |
| O-63 | Cambio estado masivo | Acción masiva | Alta | Medio |
| O-64 | Exportar dashboard PDF | Acción masiva | Alta | Medio |

---

## 14. Top 20 — Mejor Relación Impacto/Esfuerzo

Priorizadas por (impacto / esfuerzo), priorizando alta impacto con baja complejidad:

| # | Oportunidad | Complejidad | Impacto | Ratio |
|---|---|---|---|---|
| 1 | **O-18**: Mostrar paymentStatus y paymentMethod en tabla de turnos | Baja | Muy alto | ⭐⭐⭐⭐⭐ |
| 2 | **O-11**: Cliente → historial completo de visitas | Media | Muy alto | ⭐⭐⭐⭐⭐ |
| 3 | **O-39**: Botón "+ Nuevo turno" rápido para admin | Media | Muy alto | ⭐⭐⭐⭐⭐ |
| 4 | **O-44**: Pantalla "Buscar mis turnos" para anónimos | Media | Muy alto | ⭐⭐⭐⭐⭐ |
| 5 | **O-03**: StatusBreakdown click → turnos filtrados | Baja | Alto | ⭐⭐⭐⭐⭐ |
| 6 | **O-16**: Mostrar statusHistory como timeline | Baja | Alto | ⭐⭐⭐⭐⭐ |
| 7 | **O-01**: Heatmap click → turnos del día | Baja | Alto | ⭐⭐⭐⭐ |
| 8 | **O-06**: DayCard turno click → detalle/acciones | Baja | Alto | ⭐⭐⭐⭐ |
| 9 | **O-37**: Botón "Marcar pagado" independiente | Baja | Alto | ⭐⭐⭐⭐ |
| 10 | **O-45**: Historial de cambios en turno | Baja | Alto | ⭐⭐⭐⭐ |
| 11 | **O-50**: Rango de fechas en filtro de turnos | Baja | Alto | ⭐⭐⭐⭐ |
| 12 | **O-41**: Enviar recordatorio por email | Media | Alto | ⭐⭐⭐⭐ |
| 13 | **O-59**: Revenue por servicio en dashboard | Baja | Alto | ⭐⭐⭐⭐ |
| 14 | **O-61**: Exportar turnos a CSV | Media | Alto | ⭐⭐⭐⭐ |
| 15 | **O-33**: Heatmap interactivo (click → modal) | Media | Alto | ⭐⭐⭐⭐ |
| 16 | **O-34**: Charts interactivos (click → turnos) | Media | Alto | ⭐⭐⭐ |
| 17 | **O-47**: Nuevas visualizaciones con datos existentes | Media | Alto | ⭐⭐⭐ |
| 18 | **O-53**: Análisis por hora del día | Media | Alto | ⭐⭐⭐ |
| 19 | **O-54**: Análisis por día de semana | Media | Alto | ⭐⭐⭐ |
| 20 | **O-57**: Tasa de retorno de clientes | Media | Alto | ⭐⭐⭐ |

---

## 15. Quick Wins

Mejoras que se pueden implementar en menos de 1 hora cada una:

| # | Quick Win | Archivos involucrados | Esfuerzo |
|---|---|---|---|
| 1 | **Mostrar paymentStatus badge** en tabla de turnos (admin) | `AppointmentsPage/index.tsx` + `types/booking.ts` | 15 min |
| 2 | **StatusBreakdown clickeable** → navega a turnos con filtro de estado | `DashboardPage/components/StatusBreakdown.tsx` | 15 min |
| 3 | **Heatmap tooltip mejorado** con click → modal de reservas del día | `DashboardPage/components/HeatmapChart.tsx` + reutilizar `DayDetailModal` | 30 min |
| 4 | **KPI "Ingresos proyectados"** basado en turnos confirmados | `DashboardPage/components/KpiCards.tsx` | 15 min |
| 5 | **Mostrar `endTime`** en tabla y cards de turnos | `AppointmentsPage/index.tsx`, `MyAppointmentsPage/index.tsx` | 10 min |
| 6 | **Mostrar `serviceDuration`** junto al nombre del servicio | `AppointmentsPage/index.tsx`, `CalendarPage/DayCard.tsx` | 10 min |
| 7 | **Agregar presets de fecha** (Hoy, Semana, Mes) en dashboard | `DashboardPage/index.tsx` | 20 min |
| 8 | **StatsCards clickeables** en AppointmentsPage → filtro por estado | `AppointmentsPage/index.tsx` + `StatsCards.tsx` | 15 min |
| 9 | **Columna "Origen"** en tabla de turnos (staff/registered/anonymous) | `AppointmentsPage/index.tsx` | 15 min |
| 10 | **Badge "Cliente recurrente"** en turnos de clientes con historial | `AppointmentsPage/index.tsx` + cálculo local | 30 min |
| 11 | **Mostrar `cancelReason` en tooltip** en la tabla (hoy solo se ve si se hace clic en el menú) | `AppointmentsPage/index.tsx` | 10 min |
| 12 | **Barbero/servicio clickeable** en tabla de turnos → modal info | `AppointmentsPage/index.tsx` | 30 min |
| 13 | **Ticket promedio** en distribución donut | `DistribucionDonut.tsx` | 10 min |
| 14 | **Link Dashboard → Calendario** | `DashboardPage/index.tsx` | 5 min |
| 15 | **Mostrar última fecha de login** en perfil | `ProfilePage/index.tsx` | 10 min |

---

## 16. Mapa de Navegación Propuesto

```
Landing Page
├── / (hero con CTA a reservar)
│   └── [NUEVO] Mostrar barberos activos y servicios destacados
│
├── /reservar (Booking Flow)
│   └── [MEJORA] Cliente anónimo → recordatorio de email para consulta posterior
│
├── /buscar-turno [NUEVO]
│   └── Formulario email/teléfono → lista de turnos → cancelar/reprogramar
│
├── /login → /register → /recovery
│   └── [NUEVO] Flujo 2FA después de login
│
├── /mis-turnos (Cliente registrado)
│   └── [MEJORA] Mostrar endTime, duración, detalle expandible
│
├── /perfil
│   └── [MEJORA] Mostrar lastLoginAt, foto de perfil, historial de acceso
│
└── /admin
    ├── /dashboard → KPIs clickeables → /turnos?filtro=X
    │   ├── StatusBreakdown click → /turnos?status=X
    │   ├── Heatmap click → modal con reservas del día
    │   ├── Charts click → modal con turnos del período
    │   └── Donut click → /turnos?barberId=X
    │
    ├── /turnos
    │   ├── [MEJORA] Fila expandible con historial, pago, origen
    │   ├── [MEJORA] Barbero link → perfil
    │   ├── [MEJORA] Cliente link → historial modal
    │   ├── [MEJORA] Filtro por rango de fechas y paymentMethod
    │   ├── [MEJORA] Botón "Exportar CSV"
    │   └── [NUEVO] Botón "+ Nuevo turno" flotante
    │
    ├── /calendario
    │   ├── [MEJORA] DayCard turno click → detalle/acciones
    │   └── [NUEVO] Click día vacío → crear turno
    │
    ├── /profesionales
    │   ├── [MEJORA] Card expandible con horarios
    │   └── [MEJORA] Búsqueda server-side
    │
    └── /servicios
        └── [MEJORA] Ordenamiento por columnas
```

---

## Apéndice A: Mapeo Backend → Frontend de datos no utilizados

| Campo en Backend | Endpoint que lo entrega | ¿Se muestra en Frontend? | ¿Dónde debería mostrarse? |
|---|---|---|---|
| `statusHistory` | `GET /api/appointments/:id` | ❌ | Detalle del turno (timeline) |
| `createdBy` | `GET /api/appointments/:id` | ❌ | Tabla de turnos (columna Origen) |
| `paymentStatus` | `GET /api/appointments` | ❌ | Tabla + filtro |
| `paymentMethod` | `GET /api/appointments` | ❌ | Tabla + dashboard |
| `cancelledAt` | `GET /api/appointments/:id` | ❌ | Detalle del turno |
| `cancelledBy` | `GET /api/appointments/:id` | ❌ | Detalle del turno |
| `serviceDuration` | `GET /api/appointments` | ❌ | Tabla + card |
| `endTime` | `GET /api/appointments` | Parcial | MyAppointments, tabla Admin |
| `age` (barber) | `GET /api/barbers/:id` | ❌ | Card de profesional |
| `maxAdvanceDays` | `GET /api/barbers/:id` | ❌ | Booking step + card |
| `breaks` (schedule) | `GET /api/barbers/:id/schedule` | ❌ | Resumen horario |
| `lastLoginAt` | `GET /api/users/me` | ❌ | Perfil del usuario |
| `twoFactor` | Backend Model (no expuesto) | ❌ | Sección Seguridad en Perfil |
| `preset` (analytics) | `GET /api/analytics/overview` | ❌ | Botones de acceso rápido |
| `heatmap` click | `GET /api/analytics/heatmap` | Parcial (tooltip) | Click → modal de reservas |

## Apéndice B: Componentes que requieren cambios mínimos

| Componente | Cambio | Archivo |
|---|---|---|
| `HeatmapChart.tsx` | Agregar onClick en celda → abrir modal | `DashboardPage/components/HeatmapChart.tsx` |
| `StatusBreakdown.tsx` | Envolver cada fila en `<button>` con navegación | `DashboardPage/components/StatusBreakdown.tsx` |
| `KpiCards.tsx` | Envolver cada card en `<button>` o `<Link>` | `DashboardPage/components/KpiCards.tsx` |
| `StatsCards.tsx` | Cada card → click → filtro por estado | `components/common/StatsCards.tsx` |
| `DayCard.tsx` | Turno mostrado → click → modal detalle | `CalendarPage/DayCard.tsx` |
| `DistribucionDonut.tsx` | Pie → onClick → navegación | `DashboardPage/components/DistribucionDonut.tsx` |
| `DayDetailModal.tsx` | Agregar acciones sobre cada turno listado | `CalendarPage/DayDetailModal.tsx` |

---

> **Documento generado por análisis automatizado de backend y frontend.**
> Todas las oportunidades identificadas reutilizan endpoints y datos existentes.
> Ninguna requiere cambios estructurales en el backend.
