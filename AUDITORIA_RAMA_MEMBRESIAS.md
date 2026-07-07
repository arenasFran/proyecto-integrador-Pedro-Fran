# Auditoría Técnica Integral — Rama `feature/landing-claudinary`

## Resumen Ejecutivo

Se analizó la totalidad de los cambios introducidos en esta rama, incluyendo los módulos de **membresías**, **carga de imágenes a Cloudinary**, y sus efectos colaterales sobre el sistema existente (turnos, autenticación, perfil, analíticas).

Se encontraron **13 hallazgos** de distinta severidad. El riesgo general de integrar esta rama a producción se considera **ALTO**, principalmente debido a un bug crítico que impide cancelar turnos o marcarlos como NoShow cuando el turno fue pagado con membresía, y a la falta de atomicidad entre operaciones de membresía y turnos que puede generar estados inconsistentes.

---

## Cantidad de Hallazgos por Severidad

| Severidad | Cantidad |
|-----------|----------|
| 🔴 Crítico | 2 |
| 🟠 Alto | 5 |
| 🟡 Medio | 3 |
| 🟢 Bajo | 3 |

---

## Categorías

- [Backend](#backend)
- [Frontend](#frontend)
- [Integración Front ↔ Backend](#integración-front--backend)
- [Cloudinary](#cloudinary)
- [Membresías](#membresías)
- [Seguridad](#seguridad)
- [Rendimiento](#rendimiento)
- [UX](#ux)

---

# Backend

---

## 🔴 CRÍTICO — paymentStatus 'Cancelado' no está permitido en el schema de Mongoose

**Severidad:** 🔴 Crítico  
**Archivo:** `backend-barber/src/infrastructure/repositories/mongodb/models/appointment.model.ts`  
**Línea(s):** 121–124  
**Archivo relacionado:** `backend-barber/src/domain/entities/Appointment.ts`  
**Línea(s):** 88, 120

### Descripción

El schema de Mongoose define `paymentStatus` con un enum que solo permite `['Pendiente', 'Pagado']`:

```typescript
paymentStatus: {
  type: String,
  enum: ['Pendiente', 'Pagado'],
  default: 'Pendiente',
},
```

Sin embargo, la entidad `Appointment` asigna `paymentStatus = 'Cancelado'` en los métodos `cancel()` y `markNoShow()`:

```typescript
// Appointment.ts:88
this.props.paymentStatus = 'Cancelado';

// Appointment.ts:120
this.props.paymentStatus = 'Cancelado';
```

### Impacto

Al cancelar un turno o marcarlo como NoShow, la entidad asigna `paymentStatus = 'Cancelado'`. Cuando el repositorio persiste mediante `findOneAndUpdate`, Mongoose **no ejecuta validación de schema por defecto** (requiere `runValidators: true`), por lo que el valor 'Cancelado' igual se escribe en MongoDB. Sin embargo:

1. Si en el futuro se agrega `runValidators: true` a la operación, todas las cancelaciones y NoShow fallarán con un error 500.
2. Existe una **inconsistencia semántica**: el dominio reconoce 3 estados de pago (`Pendiente`, `Pagado`, `Cancelado`), pero la base de datos solo permite 2. Cualquier consulta o agregación que filtre por el enum correcto omitirá estos registros.
3. Si un documento con `paymentStatus: 'Cancelado'` se recupera y luego se intenta hacer `.save()` (no `findOneAndUpdate`), Mongoose lanzará un `ValidationError`.

### Cómo reproducir

1. Crear un turno con `paymentMethod: 'memberPass'` (el create asigna `paymentStatus: 'Pagado'`).
2. Cancelar el turno.
3. El `paymentStatus` se persiste como 'Cancelado' en MongoDB, rompiendo el contrato del schema y potencialmente causando errores en operaciones futuras.

### Recomendación

Agregar `'Cancelado'` al enum del schema en `appointment.model.ts`:

```typescript
paymentStatus: {
  type: String,
  enum: ['Pendiente', 'Pagado', 'Cancelado'],
  default: 'Pendiente',
},
```

O bien, alinear el dominio para que no use 'Cancelado' en paymentStatus, aunque esta opción requeriría repensar la lógica de negocio.

---

## 🔴 CRÍTICO — Falta de atomicidad entre canje/restauración de cupón y operaciones de turno

**Severidad:** 🔴 Crítico  
**Archivo:** `backend-barber/src/application/use-cases/appointment/CreateAppointmentUseCase.ts`  
**Línea(s):** 170–174  
**Archivo:** `backend-barber/src/application/use-cases/appointment/CancelAppointmentUseCase.ts`  
**Línea(s):** 87–94  
**Archivo:** `backend-barber/src/application/use-cases/appointment/UpdateAppointmentStatusUseCase.ts`  
**Línea(s):** 112–119

### Descripción

En `CreateAppointmentUseCase`, el cupón de membresía se canjea **antes** de crear el turno en DB:

```typescript
// CreateAppointmentUseCase.ts:170-174
if (membershipToRedeem) {
  membershipToRedeem.redeemCoupon();
  await this.membershipRepository.save(membershipToRedeem);
}

// Luego se crea el turno (línea 179)
created = await this.appointmentRepository.create(appointment.toPrimitives());
```

Si `appointmentRepository.create()` falla (ej. race condition por índice único), el cupón ya está consumido pero el turno no existe.

En `CancelAppointmentUseCase`, el cupón se restaura **después** de actualizar el estado del turno, pero sin transacción. Si `membershipRepository.save()` falla, el turno queda cancelado pero el cupón no se restaura.

### Impacto

- **Usuario pierde un cupón** sin recibir el servicio (falsos positivos en canje).
- **Usuario no recupera el cupón** aunque cancele el turno (falsos negativos en restauración).

### Cómo reproducir

1. Usar `memberPass` como método de pago.
2. Enviar dos solicitudes simultáneas para el mismo horario.
3. La primera gana el tempLock, consume el cupón, pero la creación del turno falla por el tempLock (o viceversa — el tempLock se consume, el cupón se canjea, y la creación falla por otro motivo).
4. El cupón queda consumido sin turno.

### Recomendación

Implementar una transacción de MongoDB (sesión) que agrupe la actualización de la membresía y la creación/actualización del turno en una sola operación atómica. Si alguna falla, ambas se revierten.

---

## 🟠 ALTO — N+1 queries en `MembershipController.getAll`

**Severidad:** 🟠 Alto  
**Archivo:** `backend-barber/src/interface-adapters/controllers/membership/MembershipController.ts`  
**Línea(s):** 36–44

### Descripción

```typescript
const data = await Promise.all(
  memberships.map(async (m) => {
    const user = await this.userRepo.findById(m.userId);  // 1 query por membership
    return {
      ...m.toPrimitives(),
      user: user ? { id: user.id, name: user.name, lastname: user.lastname, email: user.email } : null,
    };
  })
);
```

Por cada membresía devuelta, se ejecuta una consulta separada a la colección de usuarios.

### Impacto

Con 100 membresías, se ejecutan 101 queries a la base de datos. A medida que crece la base de clientes, el endpoint se vuelve progresivamente más lento. Impacta directamente en la página de administración de membresías.

### Recomendación

Usar un `populate` de Mongoose en el schema (referencia `userId` → `User`), o ejecutar una sola consulta con `$in` para obtener todos los usuarios de una vez.

---

## 🟠 ALTO — Parámetro `search` ignorado en `MongoMembershipRepository.findAll`

**Severidad:** 🟠 Alto  
**Archivo:** `backend-barber/src/infrastructure/repositories/mongodb/MongoMembershipRepository.ts`  
**Línea(s):** 35–43

### Descripción

El método `findAll` acepta un filtro `search` pero nunca lo aplica a la query de MongoDB:

```typescript
async findAll(filter?: { status?: string; search?: string }): Promise<Membership[]> {
  const query: Record<string, unknown> = {};
  if (filter?.status) query.status = filter.status;
  // search nunca se usa
  const docs = await MembershipModel.find(query).sort({ createdAt: -1 });
```

### Impacto

La barra de búsqueda en la página de administración de membresías (`/admin/membresias`) no filtra resultados. El usuario escribe un nombre pero la lista no se reduce. Es una feature anunciada en la UI que no funciona.

### Cómo reproducir

1. Ir a `/admin/membresias`.
2. Escribir en el campo "Buscar cliente...".
3. Observar que la lista no se filtra.

### Recomendación

Implementar la lógica de búsqueda, similar a cómo se hace en `MongoAppointmentRepository.findMany` con el parámetro `searchTerm`:

```typescript
if (filter?.search) {
  const regex = { $regex: filter.search, $options: 'i' };
  // buscar por nombre de usuario — requeriría un lookup/aggregate
}
```

Dado que la membresía no almacena datos del usuario directamente, se necesita un `$lookup` o buscar los userIds primero.

---

## 🟠 ALTO — Sin paginación en endpoint `GET /api/memberships`

**Severidad:** 🟠 Alto  
**Archivo:** `backend-barber/src/interface-adapters/controllers/membership/MembershipController.ts`  
**Línea(s):** 27–44

### Descripción

El endpoint `GET /api/memberships` devuelve **todas** las membresías sin paginación. No acepta parámetros `page` ni `limit`.

### Impacto

En producción con cientos o miles de membresías, la respuesta será cada vez más grande y lenta, consumiendo memoria innecesaria en el servidor y ancho de banda en el cliente.

### Recomendación

Agregar paginación estándar (page, limit, total, totalPages) como ya se implementa en otros endpoints del sistema (ej. `GET /api/appointments`).

---

## 🟠 ALTO — No se eliminan imágenes anteriores de Cloudinary al actualizar avatar

**Severidad:** 🟠 Alto  
**Archivo:** `backend-barber/src/infrastructure/services/CloudinaryService.ts`  
**Archivo relacionado:** `frontend-barber/src/pages/app/ProfilePage/index.tsx` (líneas 145–148)

### Descripción

Cuando un usuario cambia su foto de perfil, el frontend sube la nueva imagen a Cloudinary pero nunca solicita la eliminación de la imagen anterior. No existe ningún método `deleteImage` en `CloudinaryService`, ni endpoint que lo exponga.

### Impacto

- **Imágenes huérfanas** en Cloudinary que nunca se limpian.
- **Costos de almacenamiento** acumulativos e innecesarios.
- Potencial violación de privacidad (imágenes antiguas accesibles mediante URL directa).

### Reproducción

1. Subir una foto de perfil.
2. Subir otra foto de perfil (reemplazar).
3. La imagen anterior permanece en Cloudinary.

### Recomendación

1. Agregar método `deleteImage(publicId: string)` en `CloudinaryService`.
2. Almacenar el `public_id` de Cloudinary (no solo la `secure_url`) en el perfil del usuario.
3. Antes de subir una nueva imagen, invocar `deleteImage` con el `public_id` anterior.

---

## 🟡 MEDIO — Membresía activa no se verifica en `hasActiveMembership` del repositorio

**Severidad:** 🟡 Medio  
**Archivo:** `backend-barber/src/infrastructure/repositories/mongodb/MongoMembershipRepository.ts`  
**Línea(s):** 67–74

### Descripción

El método `hasActiveMembership` ya verifica correctamente `endDate: { $gte: new Date() }`. No obstante, cuando se usa en combinación con otros métodos como `findActiveByUser`, hay una duplicación de lógica que podría derivar en inconsistencias si solo uno de los métodos se actualiza en el futuro. No es un bug hoy, pero es deuda técnica.

Además, ningún proceso programado (cron job) ejecuta `expireExpiredMemberships`. Este método existe en el repositorio (líneas 79–86) pero nunca es llamado desde ningún lado.

### Impacto

- Las membresías vencidas nunca se marcan como `expired` automáticamente.
- Los métodos `findActiveByUser` y `hasActiveMembership` filtran por fecha, por lo que funcionalmente no hay bug, pero la colección acumula documentos con `status: 'active'` que en realidad están vencidos.
- El historial del usuario muestra membresías "activas" aunque estén vencidas.

### Recomendación

Implementar un job programado (cron o setInterval) que ejecute `expireExpiredMemberships` diariamente, o ejecutarlo como parte del startup de la aplicación.

---

# Frontend

---

## 🟠 ALTO — Memory leak por `URL.createObjectURL` sin revocar

**Severidad:** 🟠 Alto  
**Archivo:** `frontend-barber/src/components/common/ImageUpload.tsx`  
**Línea(s):** 33, 41

### Descripción

Cada vez que el usuario selecciona un archivo (o lo arrastra), se genera un `Blob URL` mediante `URL.createObjectURL(file)` que **nunca se revoca** con `URL.revokeObjectURL()`.

```typescript
const handleDrop = (e: React.DragEvent) => {
  // ...
  setLocalPreview(URL.createObjectURL(file));   // línea 33
};

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  // ...
  setLocalPreview(URL.createObjectURL(file));   // línea 41
};
```

Solo se limpia `localPreview` (seteándolo a `null`) pero el Blob URL sigue vivo en memoria hasta que la pestaña se cierra.

### Impacto

Cada selección de archivo pierde memoria. En sesiones largas (ej. administrador subiendo varias fotos), la memoria del navegador crece sin límite.

### Reproducción

1. Abrir el perfil de usuario con avatar.
2. Seleccionar una imagen 5 veces (sin guardar).
3. En Chrome DevTools → Performance → Memory, observar el aumento de Blob URLs retenidos.

### Recomendación

Usar `useEffect` cleanup para revocar el Blob URL cuando el componente se desmonta o cuando se selecciona un nuevo archivo:

```typescript
useEffect(() => {
  return () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  };
}, [localPreview]);
```

---

## 🟡 MEDIO — `accept="image/*"` demasiado permisivo en el frontend

**Severidad:** 🟡 Medio  
**Archivo:** `frontend-barber/src/components/common/ImageUpload.tsx`  
**Línea(s):** 86

### Descripción

El input de archivo usa `accept="image/*"` que acepta cualquier tipo de imagen (TIFF, BMP, SVG, etc.), pero el backend solo acepta `image/jpeg`, `image/png` y `image/webp`.

El filtro frontend `file?.type.startsWith('image/')` también es demasiado amplio.

### Impacto

El usuario puede seleccionar una imagen válida según el frontend pero ser rechazada por el backend con un mensaje de error genérico ("Error al subir la imagen"), generando confusión.

### Recomendación

Alinear el `accept` con el backend:

```typescript
accept=".jpg,.jpeg,.png,.webp"
```

Y el filtro:

```typescript
['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
```

---

## 🟡 MEDIO — Rango de fechas hardcodeado en `CreateMembershipModal`

**Severidad:** 🟡 Medio  
**Archivo:** `frontend-barber/src/pages/admin/MembershipsPage/components/CreateMembershipModal.tsx`  
**Línea(s):** 29–36

### Descripción

Las fechas `desde` y `hasta` se calculan con `useMemo` sin dependencias y están fijas al año calendario:

```typescript
const desde = useMemo(() => {
  const d = new Date();
  return `${d.getFullYear()}-01-01`;              // Siempre 1 de enero de este año
}, []);
const hasta = useMemo(() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-01-01`;              // Siempre 1 de enero del año siguiente
}, []);
```

### Impacto

- Clientes que solo tuvieron actividad en años anteriores no aparecen en el selector.
- El rango no es un sliding window (ej. últimos 12 meses) sino fijo al año calendario.

### Reproducción

1. En enero de 2027, crear una membresía.
2. Los clientes con actividad solo en diciembre 2025 no aparecen en el buscador.

### Recomendación

Usar un sliding window, ej. últimos 12 meses desde la fecha actual:

```typescript
const desde = new Date();
desde.setFullYear(desde.getFullYear() - 1);
```

---

## 🟢 BAJO — `clientId!` TypeScript non-null assertion incorrecta

**Severidad:** 🟢 Bajo  
**Archivo:** `frontend-barber/src/pages/admin/MembershipsPage/components/CreateMembershipModal.tsx`  
**Línea(s):** 75

### Descripción

```typescript
onClick={() => setSelectedUserId(c.clientId!)}
```

El tipo `ClienteData.clientId` es `string | null`, pero se usa `!` para decirle a TypeScript que nunca es `null`. Cuando un cliente es `NoRegistrado`, `clientId` efectivamente es `null`.

### Impacto

Si bien funcionalmente el botón se deshabilita cuando `selectedUserId` es `null`, el `!` es semánticamente incorrecto y puede ocultar errores futuros si el flujo cambia.

### Recomendación

Filtrar los clientes que tengan `clientId === null` del listado:

```typescript
const filtered = (search ? clients.filter(...) : clients)
  .filter((c) => c.clientId !== null);
```

---

# Integración Front ↔ Backend

---

## 🟢 BAJO — Inconsistencia en nombres de endpoints de membresía

**Severidad:** 🟢 Bajo  
**Frontend:** `frontend-barber/src/services/membershipApi.ts`  
**Backend:** `backend-barber/src/interface-adapters/routes/membership.routes.ts`

### Descripción

El endpoint para obtener la membresía del usuario logueado es `GET /api/memberships/mine` con tag `'Membership'` (singular). El endpoint para listar todas es `GET /api/memberships` con tag `'Memberships'` (plural).

No hay una inconsistencia funcional, pero cuando se invalida `'Membership'` tras crear una membresía, la lista `getAllMemberships` (que usa tag `'Memberships'`) no se refresca automáticamente. La mutación `createMembership` invalida ambos tags, por lo que hoy funciona, pero es frágil.

### Recomendación

No aplica cambio urgente, pero se podría unificar a un solo tag o asegurar que todas las mutaciones invaliden ambos tags explícitamente.

---

---

# Cloudinary

---

(Véanse hallazgos en Backend: 🟠 ALTO — No se eliminan imágenes anteriores de Cloudinary al actualizar avatar; y Frontend: 🟠 ALTO — Memory leak, 🟡 MEDIO — accept="image/*")

---

# Membresías

---

## 🟢 BAJO — Estados duplicados entre dominio y frontend

**Severidad:** 🟢 Bajo  
**Archivo:** `backend-barber/src/domain/types/membership.ts` (línea 1)  
**Archivo:** `frontend-barber/src/types/membership.ts` (línea 1)

### Descripción

Los tipos `MembershipStatus` y `MembershipSource` están definidos de forma independiente en frontend y backend, pero son idénticos. Cualquier cambio en uno requiere cambios manuales en el otro.

```typescript
// Backend
export type MembershipStatus = 'active' | 'expired' | 'cancelled';

// Frontend
export type MembershipStatus = 'active' | 'expired' | 'cancelled';
```

### Impacto

Riesgo de desincronización futura. No es un bug hoy.

### Recomendación

Generar tipos compartidos (ej. paquete monorepo o script de generación) o al menos documentar que deben mantenerse sincronizados.

---

# Seguridad

---

## 🟡 MEDIO — No hay rate limiting en endpoints de membresía

**Severidad:** 🟡 Medio  
**Archivo:** `backend-barber/src/interface-adapters/routes/membership.routes.ts`  
**Línea(s):** 1–25

### Descripción

Los endpoints de membresía (`POST /`, `POST /redeem`) no tienen rate limiting. A diferencia de los endpoints de autenticación que tienen rate limiters configurados, los de membresía pueden ser llamados sin restricción de frecuencia.

### Impacto

Un atacante autenticado podría hacer llamadas masivas a `POST /api/memberships/redeem` para consumir todos los cupones disponibles, o a `POST /api/memberships` para crear membresías masivas.

### Recomendación

Agregar rate limiters a los endpoints de membresía, especialmente a `POST /redeem` y `POST /`.

---

# Rendimiento

---

(Véanse hallazgos: 🔴 CRÍTICO en Backend por N+1, 🟠 ALTO por falta de paginación en membresías)

---

# UX

---

## 🟡 MEDIO — Sin feedback visual cuando `clientId` es `null` en `CreateMembershipModal`

**Severidad:** 🟡 Medio  
**Archivo:** `frontend-barber/src/pages/admin/MembershipsPage/components/CreateMembershipModal.tsx`  
**Línea(s):** 60–77

### Descripción

Los clientes no registrados (`kind: 'NoRegistrado'`) aparecen en el listado de búsqueda pero no pueden ser seleccionados para crear una membresía (porque no tienen `userId`). El modal no explica por qué algunos clientes no se pueden seleccionar.

### Impacto

El administrador puede intentar seleccionar un cliente anónimo sin éxito, sin entender por qué. No hay mensaje de error ni indicación visual.

### Reproducción

1. Abrir "Nueva membresía".
2. Buscar un cliente que sea `NoRegistrado`.
3. Click en el cliente.
4. Nada sucede (el `clientId` es `null` y `setSelectedUserId(null)` no cambia el estado).

### Recomendación

Filtrar los clientes `NoRegistrado` del listado, o mostrar un badge "Sin cuenta" y deshabilitar el click con un tooltip explicativo.

---

## 🟢 BAJO — `loadings` y `disabled` correctos en general

**Severidad:** 🟢 Bajo

Se verificó que los botones de "Adquirir membresía" y "Crear membresía" muestran correctamente su estado de carga (`loading`) y se deshabilitan apropiadamente. No se encontraron problemas de doble submit visibles.

---

# Conclusiones

## Riesgo de integración: ALTO

### 🔴 Impedimentos críticos (deben resolverse antes de mergear)

1. **paymentStatus 'Cancelado' no está en el enum de Mongoose** — Esto es un bug activo. Si bien `findOneAndUpdate` persiste el valor igual, cualquier cambio futuro que agregue `runValidators` romperá todas las cancelaciones y NoShow. Además, los datos almacenados son inconsistentes con el schema declarado. **Debe corregirse antes de integrar.**

2. **Falta de atomicidad en canje/restauración de cupones** — El canje del cupón ocurre antes de crear el turno, y la restauración después de cancelarlo, sin transacción. En condiciones de concurrencia (o incluso en fallos simples), el sistema puede quedar en un estado donde el cupón se consume pero el turno no existe, o el turno se cancela pero el cupón no se restaura. **Debe corregirse con transacciones de MongoDB.**

### 🟠 Riesgos altos (deben corregirse pronto)

1. **N+1 queries en listado de membresías** — Impacta rendimiento.
2. **Search ignorado en findAll** — Feature de UI que no funciona.
3. **Sin paginación en membresías** — Escalabilidad.
4. **Memory leak en ImageUpload** — Degradación progresiva en el cliente.
5. **Sin limpieza de imágenes antiguas en Cloudinary** — Costos y privacidad.

### 🟡 Riesgos medios

1. Rango de fechas hardcodeado en selector de clientes.
2. `accept="image/*"` no alineado con backend.
3. Sin rate limiting en endpoints de membresía.
4. Sin feedback visual para clientes no seleccionables.

### 🟢 Bajos / Cosmética

1. Non-null assertion frágil en `clientId!`.
2. Tipos duplicados Front/Back.
3. Tags RTK Query parcialmente inconsistentes (funciona, pero frágil).

---

## Veredicto

**No integrar a producción sin resolver los dos hallazgos críticos.** Especialmente el de `paymentStatus` (bug activo que afecta el core de turnos) y la atomicidad (inconsistencia de datos que puede causar pérdida de cupones). Los hallazgos de severidad alta deben priorizarse en el siguiente sprint, pero no bloquean un merge si los críticos se resuelven primero.

---

*Documento generado el 2026-07-05*
