# Frontend Audit

## Resumen Ejecutivo

- **Estado general**: Funcional con deuda técnica significativa. La aplicación opera correctamente en flujos principales, pero presenta problemas de arquitectura y mantenibilidad que empeorarán con el tiempo.
- **Calidad de arquitectura**: Media. Buena organización por features y correcto uso de Redux Toolkit + RTK Query, pero con mezcla de patrones (slices + servicio classes + RTK Query) que genera dos fuentes de verdad para los mismos datos.
- **Calidad del flujo de datos**: Media-baja. El dual API layer (servicios manuales + RTK Query) con invalidación manual de tags es frágil y propenso a cache stale.
- **Calidad de componentes**: Variable. Componentes comunes bien diseñados, pero páginas administrativas extremadamente grandes (1049 líneas en AppointmentsPage).
- **Calidad de UX**: Buena en general con inconsistencias menores (auto-dismiss de toasts, manejo de errores).
- **Riesgos principales**: Token refresh queue defectuoso, temp locks no liberados post-creación, cache inconsistente entre API layers, componente monolítico en AppointmentsPage.

---

# Hallazgos

## 🔴 Critical

### C1 — Queue de token refresh resuelve incorrectamente durante silent refresh

- **Archivo**: `services/api.ts:123-145`
- **Función**: `silentRefresh`

**Evidencia**:
Cuando `isRefreshing` es `true`, `silentRefresh` encola promesas en `failedQueue` con `resolve: () => resolve(true)` (línea 127), ignorando el token que `processQueue` le pasa como argumento. Las peticiones que esperan en cola nunca reciben el nuevo token en sus headers.

```ts
// api.ts:126-128 — el resolve ignora el token
failedQueue.push({
  resolve: () => resolve(true),  // token argument is ignored
  reject: () => resolve(false),
});
```

Mientras que `processQueue` espera que el resolver reciba el token:
```ts
// api.ts:45-50
const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);  // token passed here
  });
};
```

**Riesgo**: Peticiones concurrentes que fallan con 401 mientras se refresca el token nunca recuperan sus headers de autorización, resultando en errores 403/401 secundarios que el usuario ve como "sesión expirada" aunque el refresh fue exitoso.

**Impacto**: Confiabilidad, UX.

**Recomendación**: El resolver en `failedQueue` debe recibir el token y re-intentar la petición original con el nuevo token, igual como se hace en el interceptor de respuesta (líneas 79-87).

---

### C2 — Temp lock no se libera después de crear turno exitosamente

- **Archivo**: `store/slices/bookingSlice.ts:103-135`
- **Thunk**: `submitAppointment`

**Evidencia**:
El `tempLock` solo se libera en caso de error (líneas 128-130). Cuando la creación es exitosa, el lock permanece activo. Luego `submitSuccess = true` dispara navegación a `/mis-turnos` (BookingPage.tsx:159-163), y el temp lock sigue activo hasta su TTL.

```ts
// bookingSlice.ts:123-126 — creación exitosa, NO libera el lock
.addCase(submitAppointment.fulfilled, (state, action) => {
  state.async.isConfirming = false;
  state.async.submitSuccess = true;
  state.async.createdAppointment = action.payload;
})
```

```ts
// bookingSlice.ts:128-130 — solo libera en error
if (tempLockId) {
  tempLockService.release(tempLockId).catch(() => {});
}
```

**Riesgo**: El slot queda marcado como "locked" hasta que expire el TTL del servidor, impidiendo que otros usuarios (o el mismo) reserven ese horario.

**Impacto**: Confiabilidad, UX.

**Recomendación**: Liberar el temp lock después de la creación exitosa del turno, independientemente del resultado (en un bloque `finally` o en el handler `fulfilled`).

---

### C3 — Dual API layer con invalidación manual de cache frágil

- **Archivos**:
  - `services/appointment.service.ts` (servicio manual para crear turnos)
  - `services/appointmentApi.ts` (RTK Query para leer/actualizar turnos)
  - `store/slices/bookingSlice.ts:125` (invalidación manual)

**Evidencia**:
El `submitAppointment` thunk usa `appointmentService.create()` (llamada raw con Axios), y luego invalida manualmente los tags de RTK Query con `dispatch(appointmentApi.util.invalidateTags(['Appointments']))`. Si la invalidación falla silenciosamente o el tag name no coincide exactamente, el cache de RTK Query queda stale.

```ts
// bookingSlice.ts:124-126
const response = await appointmentService.create(payload);
dispatch(appointmentApi.util.invalidateTags(['Appointments']));
return response.appointment;
```

Mientras tanto, la página de admin usa `useGetAppointmentsPaginatedQuery` con polling de 30 segundos.

**Riesgo**: Turnos creados por clientes en la página pública no aparecen inmediatamente en la vista de administración. Dependen del polling de 30s.

**Impacto**: Confiabilidad, UX, Consistencia de datos.

**Recomendación**: Centralizar toda creación/modificación de appointments a través de RTK Query mutations, eliminando el servicio manual para escritura.

---

### C4 — Pre-llenado de datos de cliente con usuario autenticado puede enviar teléfono vacío

- **Archivo**: `pages/client/BookingPage/index.tsx:92-103`
- **Componente**: `BookingPage`

**Evidencia**:
Cuando `authUser` existe, se pre-llenan los campos del formulario con datos del usuario autenticado. El campo `phone` puede estar vacío (no es obligatorio en registro), y el `ClientDataOverlay` valida que si `isLoggedIn` es true, el teléfono puede estar vacío (ClientDataOverlay.tsx:37). Pero la validación del backend podría requerir teléfono.

```ts
// BookingPage.tsx:93-101
useEffect(() => {
  if (authUser) {
    if (!clientName && !clientLastname && !clientPhone && !clientEmail) {
      dispatch(setClientData({
        name: authUser.name || '',
        lastname: authUser.lastname || '',
        phone: authUser.phone || '',  // puede ser string vacío
        email: authUser.email || '',
      }));
    }
  }
}, [authUser, ...]);
```

**Riesgo**: El formulario de cliente se auto-completa con teléfono vacío y si `isLoggedIn` es true, la validación del frontend lo permite, pero el backend puede rechazar el turno por falta de teléfono.

**Impacto**: Confiabilidad.

**Recomendación**: No sobreescribir los campos del cliente si el usuario autenticado no tiene teléfono; o mostrar el teléfono como campo requerido incluso para usuarios logueados.

---

## 🟠 High

### H1 — AdminAppointmentsPage: componente monolítico de 1049 líneas

- **Archivo**: `pages/admin/AppointmentsPage/index.tsx`
- **Componente**: `AdminAppointmentsPage`

**Evidencia**:
El componente maneja:
- 10+ estados para modals (cancelTarget, rescheduleTarget, confirmTarget, detailTarget, changeBarberTarget, combinedActionTarget, showQuickCreate, etc.)
- 7 mutation hooks de RTK Query
- Lógica de ordenamiento, filtrado, paginación
- JSX duplicado para vista mobile (cards) y desktop (tabla)
- 6 modals inline (cancel, reschedule, combinedAction, detail, changeBarber, quickCreate)
- Funciones helpers inline: `formatTime`, `formatTimeRange`, `formatTimestamp`, `extractError`, `paymentBadge`, `originBadge`, `exportCSV`

**Riesgo**: Extremadamente difícil de mantener, testear o extender. Cualquier cambio requiere entender 1000+ líneas de lógica mezclada.

**Impacto**: Mantenibilidad, Escalabilidad, Legibilidad.

**Recomendación**: Extraer cada modal a su propio archivo. Extraer helpers inline a utils. Extraer la lógica de negocio (mutations + handlers) a un hook personalizado.

---

### H2 — CalendarPage hace fetch de blocks con raw `fetch()` bypassing interceptors

- **Archivo**: `pages/admin/CalendarPage/index.tsx:107-129`
- **Componente**: `CalendarPage`

**Evidencia**:
Usa `window.fetch()` directamente en lugar del Axios instance configurado, bypassing:
- Interceptor de autorización (Bearer token)
- Interceptor de refresh token
- Manejo normalizado de errores
- `withCredentials` para cookies

```ts
const res = await fetch(`/api/barbers/blocks?dateFrom=${dateFrom}&dateTo=${dateTo}`, {
  headers: token ? { Authorization: `Bearer ${token}` } : {},
});
```

Además, errores de red son silenciosamente ignorados (catch vacío en línea 125).

**Riesgo**: Si el token expira, esta petición falla sin reintentar refresh. Inconsistencia con el resto del código.

**Impacto**: Confiabilidad, Arquitectura, Consistencia.

**Recomendación**: Crear un endpoint RTK Query para blocks o usar `api.get()` de Axios con manejo de errores adecuado.

---

### H3 — DashboardPage accede a `rtkError.data` sin verificar tipo

- **Archivo**: `pages/admin/DashboardPage/index.tsx:56-60`
- **Componente**: `DashboardPage`

**Evidencia**:
```ts
const error = rtkError
  ? typeof rtkError === 'object' && 'data' in rtkError
    ? String(rtkError.data)
    : 'Error al cargar overview'
  : null;
```

`rtkError.data` puede ser un objeto, string, o undefined. `String()` en un objeto produce `[object Object]`.

**Riesgo**: Mensaje de error inútil para el usuario si el backend devuelve un error estructurado.

**Impacto**: UX.

**Recomendación**: Verificar el tipo de `error.data` y extraer el mensaje correctamente.

---

### H4 — `useFormValidation`: memoización anulada por dependencia cíclica

- **Archivo**: `hooks/useFormValidation.ts:51-73`
- **Hook**: `useFormValidation`

**Evidencia**:
`validateField` depende de `values`. Cada vez que `values` cambia (cada tecla), `validateField` se recrea. Como `handleChange`, `handleBlur`, `validateAll`, y `getFieldProps` dependen de `validateField`, todos se recrean en cada render, anulando el propósito de `useCallback`.

```ts
const validateField = useCallback(
  (field: string, value: string): string | undefined => {
    const validator = validationSchema[field];
    if (validator) return validator(value, values); // depends on `values`
    return undefined;
  },
  [values] // recreated on every keystroke
);
```

**Riesgo**: Componentes de formulario reciben nuevas referencias de funciones en cada render, causando re-renders innecesarios.

**Impacto**: Performance.

**Recomendación**: Eliminar la dependencia de `values` usando una ref para acceder al valor actual, o pasar el valor directamente en lugar de depender del closure.

---

### H5 — BookingPage dispara `getProfile` duplicado

- **Archivo**: `pages/client/BookingPage/index.tsx:105-109`
- **Componente**: `BookingPage`

**Evidencia**:
`AppInitializer` en `App.tsx` ya ejecuta `getProfile.initiate()` en el mount. BookingPage lo repite si `!authUser && getAccessToken()`.

```ts
useEffect(() => {
  if (!authUser && getAccessToken()) {
    dispatch(authApi.endpoints.getProfile.initiate());
  }
}, [authUser, dispatch]);
```

**Riesgo**: Petición HTTP duplicada al cargar la página de reserva.

**Impacto**: Performance.

**Recomendación**: Confiar en el perfil ya cargado por AppInitializer. Si el usuario no está en el store pero tiene token, usar `useGetProfileQuery` con `skip` condicional.

---

### H6 — ChartFilters sin cleanup en unmount

- **Archivo**: `pages/admin/DashboardPage/components/ChartFilters.tsx:40-44`
- **Componente**: `ChartFilters`

**Evidencia**:
```ts
useEffect(() => {
  professionalService.list()
    .then(setBarbers)
    .catch((err) => handleError(err, 'Error al cargar barberos'));
}, []);
```

Si el componente se desmonta antes de que la promesa se resuelva, `setBarbers` se ejecuta en un componente desmontado.

**Riesgo**: React warning. Potencial memory leak si la lista es grande.

**Impacto**: Confiabilidad.

**Recomendación**: Usar un flag de abort para evitar setState post-unmount, o usar RTK Query que maneja esto automáticamente.

---

### H7 — `updateBarberMe` thunk con mapeo manual y type assertions inseguras

- **Archivo**: `store/slices/barbersSlice.ts:163-179`
- **Thunk**: `updateBarberMe`

**Evidencia**:
```ts
const response = await api.put('/api/barbers/me', data);
const raw = response.data as { id: string; _id?: string; [key: string]: unknown };
const mapped: Professional = {
  id: raw.id ?? String(raw._id ?? ''),
  name: raw.name as string,
  ...
};
```

Usa `[key: string]: unknown` y castea cada campo individualmente. Si la API cambia la forma de la respuesta, el error es silencioso.

**Riesgo**: Datos corruptos en el store sin notificación.

**Impacto**: Confiabilidad, Mantenibilidad.

**Recomendación**: Tipar correctamente la respuesta de la API o usar RTK Query con `transformResponse`.

---

## 🟡 Medium

### M1 — `BookingConfirmationModal.tsx` es código muerto

- **Archivo**: `components/client/booking/BookingConfirmationModal.tsx`

**Evidencia**: El componente está definido y exportado pero no es importado por ningún otro archivo. El booking flow usa `ClientDataOverlay` en su lugar.

**Impacto**: Mantenibilidad (código que debe mantenerse sin uso), Legibilidad (falsa impresión de que existen dos flujos de confirmación).

---

### M2 — `formatTime` duplicado en dos páginas

- **Archivos**:
  - `pages/admin/AppointmentsPage/index.tsx:44-46`
  - `pages/client/MyAppointmentsPage/index.tsx:23-25`

**Evidencia**: Misma función exacta en dos lugares:
```ts
function formatTime(time: string) {
  const [h, m] = time.split(':');
  return `${h}:${m}`;
}
```

**Impacto**: Mantenibilidad. Cambiar el formato requiere editar dos archivos.

---

### M3 — Código muerto para subida de foto en ProfilePage

- **Archivo**: `pages/app/ProfilePage/index.tsx:137`

**Evidencia**: `// TODO: Subir photoFile a Cloudinary/S3 y usar la URL retornada como photoUrl`. El estado `photoFile` se setea pero nunca se consume.

**Impacto**: Mantenibilidad (código legacy que confunde).

---

### M4 — JSX duplicado para header + DateRangeFilter en DashboardPage

- **Archivo**: `pages/admin/DashboardPage/index.tsx:65-108` vs `111-117`

**Evidencia**: El header con `DateRangeFilter` se renderiza en 3 branches distintos del componente con código casi idéntico.

**Impacto**: Mantenibilidad. Cambiar el header requiere editar múltiples lugares.

---

### M5 — Callbacks no memoizados en CalendarPage

- **Archivo**: `pages/admin/CalendarPage/index.tsx:131-139`

**Evidencia**: `goPrev` y `goNext` se crean en cada render y se pasan como props a elementos del DOM.

**Impacto**: Performance menor. Re-renders innecesarios de botones.

---

### M6 — Error toasts nunca se auto-dismiss

- **Archivo**: `components/common/Toast.tsx:24-32`

**Evidencia**:
```ts
const showToast = useCallback((message: string, type: ToastType = 'success') => {
  const id = Date.now().toString() + Math.random().toString(36).slice(2);
  setToasts(prev => [...prev, { id, message, type }]);
  if (type === 'success') {
    setTimeout(() => {  // solo success tiene timeout
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }
}, []);
```

Los toasts de error se acumulan hasta que el usuario los cierra manualmente.

**Impacto**: UX. Notificaciones de error persistentes pueden saturar la interfaz.

---

### M7 — Lógica de rango de fechas duplicada

- **Archivos**:
  - `components/common/DateRangeFilter.tsx:33-77` → `resolvePreset`
  - `pages/admin/DashboardPage/index.tsx:30-38` → `getThisMonthRange`

**Evidencia**: `getThisMonthRange` en DashboardPage duplica la lógica que ya existe en `resolvePreset('mes')` en DateRangeFilter.

**Impacto**: Mantenibilidad.

---

### M8 — ClientsPage importa componente de DashboardPage, creando acoplamiento cruzado

- **Archivo**: `pages/admin/ClientsPage/index.tsx:6`

**Evidencia**: `import { ClientHistoryModal } from '../DashboardPage/components/ClientHistoryModal'`. Un page importa un componente desde otro page.

**Impacto**: Arquitectura, Mantenibilidad. Viola el principio de feature isolation.

---

## 🔵 Low

### L1 — Reset innecesario del formulario 2FA en LoginPage

- **Archivo**: `pages/public/LoginPage/index.tsx:108-112`

**Evidencia**: `resetCodeForm()` se ejecuta en cada render donde `isCodeStep` es `false`, incluso si el formulario ya está reseteado.

**Impacto**: Performance menor.

---

### L2 — `AppSidebar` renderiza nav items de usuario no utilizados

- **Archivo**: `components/sidebar/AppSidebar.tsx:29-33`

**Evidencia**: Los `userNavItems` incluyen rutas como `/reservar`, `/mis-turnos`, `/perfil` pero el sidebar solo se renderiza dentro de `AdminLayout`. Esto puede ser intencional para un layout futuro.

**Impacto**: Bajo (código muerto condicional).

---

### L3 — `formatDate.ts` no valida formato de entrada

- **Archivo**: `utils/formatDate.ts:1-4`

**Evidencia**: Si `dateStr` no está en formato `YYYY-MM-DD`, la función produce salida inconsistente.

**Impacto**: Bajo (asume datos consistentes del backend).

---

## 💡 Opportunities

### O1 — Extraer modals de AdminAppointmentsPage a archivos separados

- **Archivo**: `pages/admin/AppointmentsPage/index.tsx`
- **Justificación**: El componente tiene 1049 líneas con 6 modals inline. Extraer cada modal reduce drásticamente la complejidad.
- **Beneficio**: Mantenibilidad, Legibilidad, Testeabilidad.

---

### O2 — Crear hook compartido `useBarbers`

- **Evidencia**: 5 componentes/servicios diferentes cargan barberos de forma independiente:
  - `AdminAppointmentsPage` (`barbersSlice.fetchBarbers`)
  - `ProfilePage` (`barbersSlice.fetchBarbers`)
  - `ChartFilters` (`professionalService.list()`)
  - `BookingPage` (`fetchPublicBarbers`)
  - `MyAppointmentsPage` (`fetchPublicBarbers`)
- **Beneficio**: Reducción de código duplicado, cache centralizada, consistencia.

---

### O3 — Crear hook `useAppointmentMutations`

- **Evidencia**: `AdminAppointmentsPage` tiene 7 mutation hooks, 10+ estados de modal, y 6+ handlers de mutación. Encapsular en un hook reduciría el componente significativamente.
- **Beneficio**: Mantenibilidad, Reutilización.

---

### O4 — Eliminar `service.service.ts` (redundante con RTK Query)

- **Archivo**: `services/service.service.ts`
- **Evidencia**: Tiene un único método `list()` que ya está cubierto por `service.api.ts` con `useGetServicesQuery`. Además `service.service` no es usado por ningún componente directo (se usa `useGetServicesQuery` en su lugar).
- **Beneficio**: Eliminar código muerto, reducir dual API layer.

---

### O5 — Agregar Error Boundaries

- **Evidencia**: No existe ningún Error Boundary en la aplicación. Un error de render en cualquier componente puede tumbar toda la página.
- **Beneficio**: Resliencia, UX.

---

### O6 — Unificar formato de hora en `utils/formatTime.ts`

- **Evidencia**: `formatTime` está duplicado en `AppointmentsPage` y `MyAppointmentsPage`. Además `AppointmentDetailModal` y `SlotTimePicker` probablemente también necesiten formatear horas.
- **Beneficio**: DRY, Mantenibilidad.

---

# Métricas

| Métrica | Valor |
|---|---|
| Componentes analizados | ~56 |
| Hooks analizados | 2 |
| Pantallas analizadas | 14 |
| Total de hallazgos | 25 |
| Hallazgos por severidad | |
| 🔴 Critical | 4 |
| 🟠 High | 7 |
| 🟡 Medium | 8 |
| 🔵 Low | 3 |
| 💡 Opportunities | 6 |

---

# Conclusión

El frontend tiene una base sólida: buena organización por features, tipado consistente con TypeScript, uso correcto de Redux Toolkit, y tests unitarios + E2E. La UI es consistente y visualmente atractiva.

Sin embargo, existen **4 problemas críticos** que pueden producir bugs en producción:

1. **Queue de token refresh defectuosa**: Peticiones concurrentes durante refresh no recuperan el token correctamente, causando errores 403 espurios.
2. **Temp locks no liberados**: Slots quedan bloqueados post-creación hasta TTL, afectando disponibilidad.
3. **Dual API layer**: La mezcla de servicios manuales + RTK Query con invalidación manual de tags produce cache stale.
4. **Pre-llenado inseguro de formulario**: Datos de cliente autenticado pueden enviar teléfono vacío.

Los problemas de alta severidad se concentran en **mantenibilidad** (AppointmentsPage monolítico, fetch inconsistente, memoización anulada). La deuda técnica principal es la mezcla de dos patrones de API (servicios de clase + RTK Query) que genera dos fuentes de verdad y requiere coordinación manual entre ellos.

**Recomendación prioritaria**: Resolver los 4 hallazgos críticos antes de agregar nueva funcionalidad. Luego, refactorizar AppointmentsPage extrayendo modals y lógica de negocio. Finalmente, migrar progresivamente todos los servicios manuales a RTK Query para tener una única fuente de verdad.
