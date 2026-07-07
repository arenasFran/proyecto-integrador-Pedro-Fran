# Auditoría de Origen de Hallazgos — Rama `feature/landing-claudinary`

## Resumen de Verificación

| Estado | Cantidad |
|--------|----------|
| ✅ Confirmados | 11 |
| ⚠ Necesita verificación manual | 1 |
| ❌ Falsos positivos | 1 |

---

## Totales por Clasificación de Origen

| Clasificación | Cantidad |
|---------------|----------|
| Introducido en esta rama | 9 |
| Pre-existente (desde develop) | 2 |
| Múltiples commits involucrados | 1 |

---

## Hallazgo 1 — `paymentStatus: 'Cancelado'` incompatible con schema Mongoose

**Severidad original:** 🔴 Crítico  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Pre-existente (desde develop)

### Análisis de causa raíz

El tipo `PaymentStatus` en `domain/types/appointment.ts` fue actualizado para incluir `'Cancelado'` en el commit `4975232b`. La entidad `Appointment.cancel()` y `Appointment.markNoShow()` comenzaron a asignar `this.props.paymentStatus = 'Cancelado'` en el mismo commit. Sin embargo, **el schema de Mongoose** (`appointment.model.ts`) nunca fue actualizado para incluir `'Cancelado'` en el enum de `paymentStatus`. El schema permanece con `enum: ['Pendiente', 'Pagado']` desde su creación original.

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit (origen del bug)** | `4975232bdb5730de25059fb3a0dcbe5a7c19b27e` |
| **Mensaje** | `fix: add 'Cancelado' to PaymentStatus and update entity cancel/markNoShow to set paymentStatus='Cancelado'` |
| **Autor** | MacDuki |
| **Fecha** | 2026-07-03 21:39:47 -0300 |
| **Archivos modificados** | `backend-barber/src/domain/entities/Appointment.ts`, `backend-barber/src/domain/types/appointment.ts` |
| **Archivo NO modificado** | `backend-barber/src/infrastructure/repositories/mongodb/models/appointment.model.ts` |

**Commit del schema (última modificación):**
| Campo | Valor |
|-------|-------|
| **Commit** | `320a05a4c51b1e40b84299727bca214fb428e1eb` (merge) |
| **Mensaje** | `Merge branch 'feature/auth-2fa-obligatorio' into feature/reserva-turnos` |
| **Autor** | MacDuki |
| **Fecha** | 2026-06-10 20:39:46 -0300 |
| **Línea afectada** | Línea 123: `enum: ['Pendiente', 'Pagado']` |

### Explicación

El schema original fue creado en `2e325a2a` (arenasFran, 2026-06-03) y su última modificación fue en el merge `320a05a4` (MacDuki, 2026-06-10). Cuando `4975232b` agregó `paymentStatus = 'Cancelado'` en la entidad, **no se modificó el schema de Mongoose**. Esto deja el schema y la entidad en un estado inconsistente.

El bug existe en develop desde el 3 de julio de 2026. Esta rama lo hereda sin modificarlo.

### Nivel de confianza: Alto

El `git blame` confirma que `4975232b` introdujo `paymentStatus = 'Cancelado'` en `Appointment.ts:88` y `Appointment.ts:120`, mientras que `appointment.model.ts:123` nunca fue modificado para incluirlo.

---

## Hallazgo 2 — Falta de atomicidad entre canje/restauración de cupón y operaciones de turno

**Severidad original:** 🔴 Crítico  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

El commit `17c0f20b` integró la membresía en `CreateAppointmentUseCase` y `CancelAppointmentUseCase` sin usar transacciones de MongoDB. El canje del cupón ocurre **antes** de crear el turno en `CreateAppointmentUseCase`, y la restauración ocurre **después** de cancelar el turno en `CancelAppointmentUseCase`, sin ninguna transacción que agrupe ambas operaciones.

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `17c0f20b4a90a7a465e7a4b2fb10d332b5d3a588` |
| **Mensaje** | `feat: integrar membresía al flujo de creación y cancelación de turnos` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-04 21:37:09 -0300 |
| **Archivos** | `CreateAppointmentUseCase.ts`, `CancelAppointmentUseCase.ts`, `appointment.validator.ts`, `wiring/appointment.ts`, `bookingSlice.ts`, `types/booking.ts` |

### Líneas exactas

```typescript
// CreateAppointmentUseCase.ts:170-174 (git blame: 17c0f20b)
if (membershipToRedeem) {
  membershipToRedeem.redeemCoupon();
  await this.membershipRepository.save(membershipToRedeem);  // Cupón canjeado ANTES de crear turno
}
// ... luego:
created = await this.appointmentRepository.create(appointment.toPrimitives());  // Creación del turno
```

```typescript
// CancelAppointmentUseCase.ts:87-94 (git blame: 17c0f20b)
await this.appointmentRepository.updateStatus(id, updateData);  // Turno cancelado
// ... luego:
if (membership) {
  membership.restoreCoupon();
  await this.membershipRepository.save(membership);  // Cupón restaurado DESPUÉS
}
```

### Nivel de confianza: Alto

El `git blame` en ambas líneas muestra `17c0f20b` como el commit de origen.

---

## Hallazgo 3 — N+1 queries en `MembershipController.getAll`

**Severidad original:** 🟠 Alto  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

El controlador `getAll` ejecuta una consulta por cada membresía para obtener los datos del usuario. Esto fue introducido desde la creación del módulo.

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `119b6be152f66dd16534bd2f3ddbb0f3774b33b5` |
| **Mensaje** | `feat: agregar módulo de membresía (entidad, repo, API)` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-04 21:36:53 -0300 |
| **Archivo** | `MembershipController.ts` |
| **Líneas** | 36–44 |

### Nivel de confianza: Alto

El `git blame` en las líneas 36–44 muestra `119b6be1` como el único commit de origen.

---

## Hallazgo 4 — Parámetro `search` ignorado en `MongoMembershipRepository.findAll`

**Severidad original:** 🟠 Alto  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

El método `findAll` acepta `search` en el filtro pero nunca lo aplica a la query.

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `119b6be152f66dd16534bd2f3ddbb0f3774b33b5` |
| **Mensaje** | `feat: agregar módulo de membresía (entidad, repo, API)` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-04 21:36:53 -0300 |
| **Archivo** | `MongoMembershipRepository.ts` |
| **Líneas** | 35–43 |

### Nivel de confianza: Alto

El `git blame` confirma que el método completo fue creado en `119b6be1` y el parámetro `search` nunca fue usado desde el inicio.

---

## Hallazgo 5 — Sin paginación en endpoint `GET /api/memberships`

**Severidad original:** 🟠 Alto  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

El endpoint creado en `119b6be` no implementa paginación, a diferencia de otros endpoints del sistema (ej. appointments, barbers).

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `119b6be152f66dd16534bd2f3ddbb0f3774b33b5` |
| **Mensaje** | `feat: agregar módulo de membresía (entidad, repo, API)` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-04 21:36:53 -0300 |
| **Archivo** | `MembershipController.ts` |

### Nivel de confianza: Alto

El `git blame` en el handler `getAll` muestra `119b6be1`.

---

## Hallazgo 6 — Memory leak por `URL.createObjectURL` sin revocar

**Severidad original:** 🟠 Alto  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Pre-existente (desde develop)

### Análisis de causa raíz

El componente `ImageUpload` fue creado con `URL.createObjectURL(file)` en los handlers `handleDrop` y `handleFileSelect`, pero nunca se llama a `URL.revokeObjectURL()`. El commit posterior `c756fad` agregó lógica adicional (reset post-guardado) pero tampoco corrigió la fuga.

### Evidencia Git

**Commit de origen:**
| Campo | Valor |
|-------|-------|
| **Commit** | `446033f2dc481cfc29c84c7c3950e5034229ef95` |
| **Mensaje** | `feat: crear componentes base Modal, BarberAvatar e ImageUpload` |
| **Autor** | franc |
| **Fecha** | 2026-06-29 00:21:53 -0300 |
| **Archivo** | `ImageUpload.tsx` |
| **Líneas** | 33, 41 |

**Commit que modificó sin corregir:**
| Campo | Valor |
|-------|-------|
| **Commit** | `c756fad621c746c74955b2cbf481cc0380cff38a` |
| **Mensaje** | `fix: resetear ImageUpload a estado default post-guardado y al remover foto` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-03 20:28:32 -0300 |

### Nivel de confianza: Alto

El `git blame` en las líneas 33 y 41 muestra `446033f` como el commit de origen del `URL.createObjectURL`. El componente existe en develop desde antes de esta rama.

---

## Hallazgo 7 — No se eliminan imágenes anteriores de Cloudinary al actualizar avatar

**Severidad original:** 🟠 Alto  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

El servicio `CloudinaryService` fue creado con un método `uploadImage` pero sin método `deleteImage`. El controlador `UploadController` solo implementa subida, nunca eliminación.

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `2e4cdb7864aa9f8376a694711a9b7b7b100f7503` |
| **Mensaje** | `feat: integrar Cloudinary para subida de fotos de perfil` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-03 20:28:59 -0300 |
| **Archivos** | `CloudinaryService.ts`, `UploadController.ts`, `upload.middleware.ts`, `upload.routes.ts` |

### Nivel de confianza: Alto

El `CloudinaryService` solo tiene un commit en su historia (`2e4cdb7`), y no incluye métodos de eliminación.

---

## Hallazgo 8 — Rango de fechas hardcodeado en `CreateMembershipModal`

**Severidad original:** 🟡 Medio  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

El modal usa fechas fijas al 1 de enero del año actual y siguiente, en lugar de un sliding window (ej. últimos 12 meses).

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `cc592482467c5fa1542d536dff344f368143ed36` |
| **Mensaje** | `feat: agregar páginas de membresía y membershipApi en frontend` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-04 21:37:04 -0300 |
| **Archivo** | `CreateMembershipModal.tsx` |
| **Líneas** | 20–27 |

### Nivel de confianza: Alto

El `git blame` en las líneas 20–27 muestra `cc59248`.

---

## Hallazgo 9 — `clientId!` TypeScript non-null assertion incorrecta

**Severidad original:** 🟢 Bajo  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

Se usa `c.clientId!` en el onClick de cada cliente del listado, cuando `clientId` puede ser `null` para clientes `NoRegistrado`.

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `cc592482467c5fa1542d536dff344f368143ed36` |
| **Mensaje** | `feat: agregar páginas de membresía y membershipApi en frontend` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-04 21:37:04 -0300 |
| **Archivo** | `CreateMembershipModal.tsx` |
| **Línea** | 71 |

### Nivel de confianza: Alto

El `git blame` en la línea 71 muestra `cc59248`.

---

## Hallazgo 10 — Sin rate limiting en endpoints de membresía

**Severidad original:** 🟡 Medio  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

Las rutas de membresía fueron creadas sin rate limiters, a diferencia de los endpoints de autenticación.

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `119b6be152f66dd16534bd2f3ddbb0f3774b33b5` |
| **Mensaje** | `feat: agregar módulo de membresía (entidad, repo, API)` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-04 21:36:53 -0300 |
| **Archivo** | `membership.routes.ts` |

### Nivel de confianza: Alto

El archivo completo fue creado en `119b6be` sin importar ni usar `express-rate-limit`.

---

## Hallazgo 11 — `expireExpiredMemberships` nunca se ejecuta

**Severidad original:** 🟡 Medio  
**Estado de verificación:** ⚠ Necesita verificación manual  
**Clasificación de origen:** Introducido en esta rama

### Análisis de causa raíz

El método `expireExpiredMemberships` existe en `MongoMembershipRepository` pero **no se invoca desde ningún lugar** del sistema (no hay cron job, no hay startup hook, no hay endpoint).

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit** | `119b6be152f66dd16534bd2f3ddbb0f3774b33b5` |
| **Mensaje** | `feat: agregar módulo de membresía (entidad, repo, API)` |
| **Autor** | arenasFran |
| **Fecha** | 2026-07-04 21:36:53 -0300 |
| **Archivo** | `MongoMembershipRepository.ts` |
| **Líneas** | 82–91 |

### Verificación manual requerida

Se debe confirmar que no existe un cron job externo, un `setInterval`, un webhook, o un worker que llame a este método. La búsqueda en el código (`grep -r "expireExpiredMemberships"`) no encontró llamadas, pero debe verificarse que no se haya configurado externamente (infraestructura, scripts, CI).

### Nivel de confianza: Medio

El método nunca se invoca en el código fuente, pero podría ser parte de un job externo no rastreado en Git.

---

## Hallazgo 12 — Estados duplicados entre dominio y frontend

**Severidad original:** 🟢 Bajo  
**Estado de verificación:** ❌ Falso Positivo  

### Análisis

Los tipos `MembershipStatus` y `MembershipSource` están duplicados entre frontend y backend. Esto es inherente a la arquitectura del proyecto (frontend y backend son repos separados en el mismo monorepo). Todos los demás tipos del sistema también están duplicados (ej. `AppointmentStatus`, `PaymentMethod`, `BarberPublic`). Señalar esto como un hallazgo específico para membresías sin señalarlo para el resto del sistema es inconsistente.

### Decisión

Se elimina de la lista de hallazgos. No es un problema específico de esta rama ni de membresías.

---

## Hallazgo 13 — `accept="image/*"` demasiado permisivo en el frontend

**Severidad original:** 🟡 Medio  
**Estado de verificación:** ✅ Confirmado  
**Clasificación de origen:** Pre-existente (desde develop)

### Análisis de causa raíz

El componente `ImageUpload` usa `accept="image/*"` y filtra con `file.type.startsWith('image/')`, mientras que el middleware del backend solo acepta `image/jpeg`, `image/png` y `image/webp`.

### Evidencia Git

| Campo | Valor |
|-------|-------|
| **Commit (origen)** | `446033f2dc481cfc29c84c7c3950e5034229ef95` |
| **Mensaje** | `feat: crear componentes base Modal, BarberAvatar e ImageUpload` |
| **Autor** | franc |
| **Fecha** | 2026-06-29 00:21:53 -0300 |
| **Archivo** | `ImageUpload.tsx` |
| **Líneas** | 31, 39, 86 |

### Nivel de confianza: Alto

El `git blame` confirma que el filtro `startsWith('image/')` y `accept="image/*"` fueron introducidos en `446033f`. El middleware `upload.middleware.ts` fue creado posteriormente en `2e4cdb7` por arenasFran con una lista más restrictiva.

---

## Totales Finales

### Hallazgos confirmados: 11

| ID | Título | Severidad | Origen |
|----|--------|-----------|--------|
| 1 | `paymentStatus` incompatible con schema | 🔴 Crítico | Pre-existente |
| 2 | Falta de atomicidad cupón-turno | 🔴 Crítico | Esta rama |
| 3 | N+1 queries en GET /api/memberships | 🟠 Alto | Esta rama |
| 4 | `search` ignorado en findAll | 🟠 Alto | Esta rama |
| 5 | Sin paginación en membresías | 🟠 Alto | Esta rama |
| 6 | Memory leak en ImageUpload | 🟠 Alto | Pre-existente |
| 7 | Sin eliminación de imágenes Cloudinary | 🟠 Alto | Esta rama |
| 8 | Fechas hardcodeadas en CreateMembershipModal | 🟡 Medio | Esta rama |
| 9 | `clientId!` assertion incorrecta | 🟢 Bajo | Esta rama |
| 10 | Sin rate limiting en membresías | 🟡 Medio | Esta rama |
| 13 | `accept="image/*"` demasiado permisivo | 🟡 Medio | Pre-existente |

### Falsos positivos eliminados: 1

- Hallazgo 12 (tipos duplicados) — práctica general del proyecto, no específica de membresías

### Pendientes de verificación manual: 1

- Hallazgo 11 (`expireExpiredMemberships` no invocado)

---

## Agrupación por Autor

| Autor | Hallazgos |
|-------|-----------|
| **arenasFran** | 2, 3, 4, 5, 7, 8, 9, 10, (11 pendiente) |
| **MacDuki** | 1 |
| **franc** | 6, 13 |

---

## Agrupación por Commit

| Commit | Hallazgos | Severidad |
|--------|-----------|-----------|
| `119b6be` | 3, 4, 5, 10, (11) | 🟠🟠🟠🟡🟡 |
| `17c0f20b` | 2 | 🔴 |
| `cc59248` | 8, 9 | 🟡🟢 |
| `2e4cdb7` | 7 | 🟠 |
| `4975232b` (pre-existente) | 1 | 🔴 |
| `446033f` (pre-existente) | 6, 13 | 🟠🟡 |

---

## Commits con Mayor Concentración de Defectos

| Commit | Defectos | Críticos | Altos |
|--------|----------|----------|-------|
| **`119b6be`** | 5 | 0 | 3 |
| **`cc59248`** | 2 | 0 | 0 |
| **`17c0f20b`** | 1 | 1 | 0 |

El commit `119b6be` (arenasFran, "feat: agregar módulo de membresía") concentra la mayor cantidad de issues, aunque ninguno crítico. El commit `17c0f20b` (arenasFran, "feat: integrar membresía al flujo de creación y cancelación de turnos") introduce el único hallazgo crítico originado en esta rama.

---

## Evaluación de Confianza General de la Auditoría

| Aspecto | Evaluación |
|---------|------------|
| **Cobertura de verificación** | 11/13 hallazgos confirmados con `git blame` directo |
| **Falsos positivos detectados** | 1 (tipos duplicados — falso positivo) |
| **Pendientes de verificación** | 1 (cron job externo) |
| **Precisión de atribuciones** | Alta — todas las atribuciones están respaldadas por `git blame`, `git show` y verificación visual del código |
| **Riesgo de atribución incorrecta** | Bajo — los commits de origen coinciden con la primera aparición de cada línea de código problemática |

**Conclusión:** La auditoría tiene un nivel de confianza **alto**. Todas las atribuciones, excepto una, están confirmadas con evidencia Git directa y reproducible. El único hallazgo crítico originado en esta rama (falta de atomicidad) corresponde al commit `17c0f20b` de arenasFran.

---

*Documento generado el 2026-07-05*
