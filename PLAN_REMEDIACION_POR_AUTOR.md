# Plan de Remediación por Autor

## Executive Summary

| Métrica | Valor |
|---------|-------|
| **Total de issues confirmados** | 11 |
| **🔴 Críticos** | 2 |
| **🟠 Altos** | 5 |
| **🟡 Medios** | 3 |
| **🟢 Bajos** | 1 |

### Issues por Autor

| Autor | Issues | Críticos | Altos | Medios | Bajos |
|-------|--------|----------|-------|--------|-------|
| **Fran** | 10 | 1 | 5 | 3 | 1 |
| **MacDuki** | 1 | 1 | 0 | 0 | 0 |

### Riesgo Técnico General

**ALTO.** Existen dos issues críticos: uno bloquea el core del sistema de turnos (`paymentStatus` incompatible con el schema de Mongoose) y otro puede causar pérdida de cupones por falta de atomicidad. Ambos deben resolverse antes de integrar a producción.

### Prioridad de remediación recomendada

1. Resolver los dos críticos (MacDuki y Fran) de forma inmediata.
2. Abordar los cinco de severidad alta en el siguiente sprint, priorizando los que afectan la experiencia del administrador (búsqueda, paginación, rendimiento).
3. Los de severidad media y baja pueden planificarse en sprints subsiguientes, aunque rate limiting debería adelantarse por seguridad.

---

# Author: Fran

10 issues confirmados (1 crítico, 5 altos, 3 medios, 1 bajo). Incluye trabajo realizado bajo los usuarios Git `arenasFran` (commits `17c0f20b`, `119b6be`, `cc59248`, `2e4cdb7`, `c756fad`) y `franc` (commit `446033f`).

---

## Falta de atomicidad entre canje/restauración de cupón y operaciones de turno

**Severidad:** 🔴 Crítico

**Archivos afectados:**
- `backend-barber/src/application/use-cases/appointment/CreateAppointmentUseCase.ts` (líneas 170–174)
- `backend-barber/src/application/use-cases/appointment/CancelAppointmentUseCase.ts` (líneas 87–94)

**Descripción:**

En `CreateAppointmentUseCase`, el cupón de membresía se canjea (via `membershipToRedeem.redeemCoupon()` + `membershipRepository.save()`) **antes** de crear el turno en base de datos. Si la creación del turno falla —por ejemplo, por una condición de carrera con un índice único de horario— el cupón ya está consumido pero el turno no existe.

Simétricamente, en `CancelAppointmentUseCase` el cupón se restaura **después** de actualizar el estado del turno. Si `membershipRepository.save()` falla, el turno queda cancelado pero el cupón no se restaura, dejando al usuario sin beneficio.

Ninguna de las dos operaciones usa transacciones de MongoDB. No hay atomicidad entre la mutación de la membresía y la del turno.

### Por qué debería solucionarse

- **Inconsistencia de datos:** El sistema puede quedar con un cupón consumido sin un turno asociado, o con un turno cancelado sin el cupón restaurado.
- **Pérdida de beneficios para el usuario:** El cliente pierde su cupón sin recibir el servicio, o no lo recupera al cancelar.
- **Falsos ingresos:** Desde la perspectiva del negocio, un cupón canjeado sin turno representa un servicio no prestado pero descontado del inventario de membresías.

### Solución sugerida

Implementar **transacciones de MongoDB (sesiones)** que agrupen la actualización de la membresía y la creación/actualización del turno en una sola operación atómica. Si cualquiera de las dos operaciones falla, ambas se revierten.

Alternativa: aplicar un patrón de **event sourcing / outbox** donde primero se persiste el turno y el canje/restauración se maneja como un evento eventualmente consistente. Sin embargo, esta opción introduce mayor complejidad para el estado actual del proyecto. Se recomienda transacciones de MongoDB por ser un cambio más acotado y con soporte nativo del driver.

---

## N+1 queries en `MembershipController.getAll`

**Severidad:** 🟠 Alto

**Archivo afectado:**
- `backend-barber/src/interface-adapters/controllers/membership/MembershipController.ts` (líneas 36–44)

**Descripción:**

El método `getAll` obtiene todas las membresías y luego ejecuta una consulta separada por cada una para resolver los datos del usuario (`userRepo.findById`). Con N membresías se generan N+1 queries a MongoDB.

### Por qué debería solucionarse

- **Degradación progresiva del rendimiento:** A medida que crece la base de clientes, el endpoint se vuelve cuadráticamente más lento.
- **Impacto directo en la experiencia del administrador:** La página de administración de membresías se vuelve lenta o timeout con decenas de membresías.
- **Mayor carga en la base de datos:** Consultas innecesarias que compiten con otras operaciones del sistema.

### Solución sugerida

Reemplazar las N consultas individuales por una sola consulta con el operador `$in` para obtener todos los usuarios referenciados en una única operación. Alternativamente, usar `populate` de Mongoose si se define una referencia en el schema. Se recomienda `$in` para mantener el patrón actual del repositorio sin acoplar el schema a relaciones de Mongoose.

---

## Parámetro `search` ignorado en `MongoMembershipRepository.findAll`

**Severidad:** 🟠 Alto

**Archivo afectado:**
- `backend-barber/src/infrastructure/repositories/mongodb/MongoMembershipRepository.ts` (líneas 35–43)

**Descripción:**

El método `findAll` acepta un filtro `{ status?, search? }`, pero el campo `search` nunca se aplica a la query de MongoDB. El controlador pasa el parámetro pero el repositorio lo ignora silenciosamente.

### Por qué debería solucionarse

- **Funcionalidad anunciada que no funciona:** La UI de administración tiene una barra de búsqueda que no filita resultados. El usuario escribe un nombre y la lista no se reduce.
- **Mala experiencia de administrador:** Impide la gestión eficiente de membresías cuando hay muchos clientes.
- **Comportamiento silencioso:** No hay error ni advertencia; el sistema aparenta funcionar pero ignora la intención del usuario.

### Solución sugerida

Implementar la búsqueda mediante un pipeline de agregación con `$lookup` hacia la colección de usuarios, filtrando por nombre/apellido con `$regex` case-insensitive. Debe replicarse el patrón usado en `MongoAppointmentRepository.findMany` con su parámetro `searchTerm`. Si el volumen de datos lo justifica, considerar un índice de texto en MongoDB.

---

## Sin paginación en endpoint `GET /api/memberships`

**Severidad:** 🟠 Alto

**Archivo afectado:**
- `backend-barber/src/interface-adapters/controllers/membership/MembershipController.ts` (líneas 27–44)

**Descripción:**

El endpoint devuelve **todas** las membresías sin soportar parámetros `page` ni `limit`. A diferencia de otros endpoints del sistema (appointments, barbers) que ya implementan paginación estándar, el de membresías no tiene límite de resultados.

### Por qué debería solucionarse

- **Problema de escalabilidad:** Con cientos o miles de membresías, la respuesta crece sin límite en tamaño y tiempo de generación.
- **Consumo excesivo de memoria:** El servidor carga todos los documentos en memoria antes de serializar la respuesta.
- **Ancho de banda:** Respuestas innecesariamente grandes para el cliente.
- **Inconsistencia con el resto del sistema:** Los demás endpoints paginan correctamente.

### Solución sugerida

Agregar parámetros `page` y `limit` con valores por defecto sensatos (ej. page=1, limit=20). La respuesta debe incluir metadatos de paginación (`total`, `totalPages`, `page`, `limit`) siguiendo el mismo formato que `GET /api/appointments`. Implementar `skip` y `limit` en la query de MongoDB.

---

## Memory leak por `URL.createObjectURL` sin revocar

**Severidad:** 🟠 Alto

**Archivo afectado:**
- `frontend-barber/src/components/common/ImageUpload.tsx` (líneas 33, 41)

**Descripción:**

Cada vez que el usuario selecciona o arrastra un archivo, se genera un Blob URL mediante `URL.createObjectURL(file)` que se asigna a `localPreview`. Cuando se selecciona otro archivo o el componente se desmonta, el Blob URL anterior **nunca** se revoca con `URL.revokeObjectURL()`. Solo se limpia el estado (`localPreview = null`) pero la memoria retenida por el Blob URL persiste hasta que la pestaña del navegador se cierra.

### Por qué debería solucionarse

- **Degradación progresiva de memoria:** En sesiones largas (administrador subiendo fotos de varios barberos/clientes), la memoria del navegador crece sin límite.
- **Potencial crash en navegadores con memoria limitada:** Dispositivos móviles o tablets se ven más afectados.
- **Mala práctica de desarrollo:** Los Blob URLs son recursos explícitamente gestionados que deben limpiarse.

### Solución sugerida

Agregar un `useEffect` con cleanup que revoque el Blob URL actual cuando `localPreview` cambie o el componente se desmonte:

```
useEffect(() => {
  return () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  };
}, [localPreview]);
```

Además, revocar el Blob URL anterior antes de generar uno nuevo en los handlers `handleDrop` y `handleFileSelect`.

---

## No se eliminan imágenes anteriores de Cloudinary al actualizar avatar

**Severidad:** 🟠 Alto

**Archivos afectados:**
- `backend-barber/src/infrastructure/services/CloudinaryService.ts`
- `backend-barber/src/interface-adapters/controllers/upload/UploadController.ts`

**Descripción:**

El servicio `CloudinaryService` solo implementa `uploadImage`. No existe un método `deleteImage`. Cuando un usuario cambia su foto de perfil, la imagen anterior permanece en Cloudinary indefinidamente. No se almacena el `public_id` de Cloudinary en el perfil del usuario, solo la `secure_url`, lo que imposibilita la eliminación aunque se agregue el método.

### Por qué debería solucionarse

- **Costos de almacenamiento acumulativos:** Cada cambio de foto genera una imagen huérfana que nunca se limpia.
- **Privacidad:** Las imágenes antiguas siguen siendo accesibles mediante su URL directa de Cloudinary, incluso si el usuario ya no las usa.
- **Desperdicio de recursos:** El bucket de Cloudinary se llena con datos innecesarios.

### Solución sugerida

1. Agregar método `deleteImage(publicId: string)` en `CloudinaryService`.
2. Almacenar el `public_id` (no solo la `secure_url`) en el modelo de usuario, junto a la URL.
3. En el flujo de actualización de avatar, antes de subir la nueva imagen, invocar `deleteImage` con el `public_id` anterior.
4. Considerar agregar un campo `cloudinaryPublicId` al schema de User.

---

## Rango de fechas hardcodeado en `CreateMembershipModal`

**Severidad:** 🟡 Medio

**Archivo afectado:**
- `frontend-barber/src/pages/admin/MembershipsPage/components/CreateMembershipModal.tsx` (líneas 29–36)

**Descripción:**

Las fechas `desde` y `hasta` para filtrar la búsqueda de clientes están fijas al año calendario usando `new Date().getFullYear()`. El rango siempre comienza el 1 de enero del año actual y termina el 1 de enero del año siguiente. No es un sliding window.

### Por qué debería solucionarse

- **Clientes excluidos del selector:** Clientes que solo tuvieron actividad en meses anteriores al año calendario actual no aparecen en los resultados de búsqueda.
- **Falsa sensación de cobertura:** El administrador puede creer que está viendo todos los clientes cuando en realidad el filtro temporal está ocultando una parte del histórico.
- **Comportamiento incorrecto con el tiempo:** Cada año el rango cambia abruptamente, en lugar de deslizarse continuamente.

### Solución sugerida

Reemplazar el cálculo fijo por un sliding window de los últimos 12 meses desde la fecha actual. Alternativamente, eliminar el filtro temporal por defecto y dejarlo como un control opcional para el administrador.

---

## Sin rate limiting en endpoints de membresía

**Severidad:** 🟡 Medio

**Archivo afectado:**
- `backend-barber/src/interface-adapters/routes/membership.routes.ts`

**Descripción:**

Los endpoints de membresía (`POST /api/memberships`, `POST /api/memberships/redeem`) no tienen rate limiting. Los endpoints de autenticación del mismo proyecto sí lo implementan, pero el módulo de membresías se creó sin seguir ese patrón.

### Por qué debería solucionarse

- **Ataque de consumo de cupones:** Un atacante autenticado puede llamar masivamente a `POST /redeem` para agotar todos los cupones disponibles.
- **Creación masiva de membresías:** El endpoint `POST /` podría usarse para generar registros fraudulentos o simplemente saturar la base de datos.
- **Inconsistencia de seguridad:** El resto del sistema tiene rate limiting; el módulo de membresías queda como un vector de ataque sin protección.

### Solución sugerida

Aplicar el mismo middleware `express-rate-limit` que ya se usa en las rutas de autenticación. Configurar límites específicos para cada endpoint: más restrictivo para `POST /redeem` (ej. 5 solicitudes por minuto por usuario) y moderado para `POST /` (ej. 10 por minuto).

---

## `accept="image/*"` demasiado permisivo en el frontend

**Severidad:** 🟡 Medio

**Archivo afectado:**
- `frontend-barber/src/components/common/ImageUpload.tsx` (líneas 31, 39, 86)

**Descripción:**

El input de archivo usa `accept="image/*"` y el filtro en JavaScript verifica `file.type.startsWith('image/')`. Estos aceptan cualquier subtipo de imagen (TIFF, BMP, SVG, WebP, etc.). Sin embargo, el backend (`upload.middleware.ts`) solo acepta `image/jpeg`, `image/png` y `image/webp`.

### Por qué debería solucionarse

- **Mala experiencia de usuario:** El usuario puede seleccionar una imagen válida según el frontend pero ser rechazada por el backend con un mensaje de error genérico.
- **Fricción innecesaria:** El usuario no entiende por qué su imagen fue rechazada si el frontend la aceptó.
- **Validación inconsistente:** Las capas frontend y backend no están alineadas en sus contractos.

### Solución sugerida

Alinear los formatos aceptados en frontend con los del backend:

```
accept=".jpg,.jpeg,.png,.webp"
```

Y actualizar el filtro JavaScript:

```
['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
```

---

## `clientId!` TypeScript non-null assertion incorrecta

**Severidad:** 🟢 Bajo

**Archivo afectado:**
- `frontend-barber/src/pages/admin/MembershipsPage/components/CreateMembershipModal.tsx` (línea 75)

**Descripción:**

En el `onClick` de cada cliente del listado se usa `c.clientId!` para forzar el tipo, pero `ClienteData.clientId` es `string | null`. Cuando un cliente es `NoRegistrado`, `clientId` es efectivamente `null`. El botón se deshabilita cuando `selectedUserId` es `null`, pero el `!` es semánticamente incorrecto y suprime advertencias del compilador que podrían detectar errores reales.

### Por qué debería solucionarse

- **Deuda técnica:** El non-null assertion oculta un problema de tipado en lugar de resolverlo.
- **Riesgo de regresión futura:** Si el flujo cambia y el botón ya no se deshabilita correctamente, el `!` enmascarará el error hasta que llegue a producción.
- **Mala señal para el codebase:** Normaliza una práctica insegura de TypeScript.

### Solución sugerida

Filtrar los clientes con `clientId === null` del listado antes de renderizar:

```
const filteredClients = clients.filter((c) => c.clientId !== null);
```

De esta forma, el tipo se estrecha naturalmente y no es necesario usar `!`. Alternativamente, si se desea mostrar clientes no registrados con una indicación visual (badge "Sin cuenta"), el handler debe validar explícitamente.

---

# Author: MacDuki

1 issue confirmado (1 crítico).

---

## `paymentStatus: 'Cancelado'` incompatible con schema Mongoose

**Severidad:** 🔴 Crítico

**Archivos afectados:**
- `backend-barber/src/infrastructure/repositories/mongodb/models/appointment.model.ts` (línea 123)
- `backend-barber/src/domain/entities/Appointment.ts` (líneas 88, 120)
- `backend-barber/src/domain/types/appointment.ts`

**Descripción:**

El tipo `PaymentStatus` en el dominio fue actualizado para incluir `'Cancelado'`. La entidad `Appointment` asigna `paymentStatus = 'Cancelado'` en los métodos `cancel()` y `markNoShow()`. Sin embargo, el schema de Mongoose en `appointment.model.ts` nunca fue actualizado: su enum sigue siendo `['Pendiente', 'Pagado']`.

Actualmente, `findOneAndUpdate` persiste el valor omitiendo la validación del schema (porque por defecto no ejecuta `runValidators`), por lo que el bug está latente. Si en el futuro se agrega `runValidators: true` o se usa `.save()`, todas las cancelaciones y NoShow fallarán con un `ValidationError`.

### Por qué debería solucionarse

- **Bug activo de inconsistencia:** El dominio y la base de datos tienen contractos diferentes para el mismo campo. Los datos almacenados con `paymentStatus: 'Cancelado'` violan el schema declarado.
- **Riesgo de falla en producción:** Cualquier cambio que active validación de schema romperá el flujo de cancelación de turnos.
- **Consultas y agregaciones incorrectas:** Cualquier filtro o agregación que use el enum correcto (los 3 valores) omitirá o clasificará erróneamente registros con `'Cancelado'`.
- **Afecta el core del negocio:** La cancelación de turnos y el marcado de NoShow son funcionalidades centrales del sistema de reservas.

### Solución sugerida

Agregar `'Cancelado'` al enum del schema de Mongoose en `appointment.model.ts`:

```
paymentStatus: {
  type: String,
  enum: ['Pendiente', 'Pagado', 'Cancelado'],
  default: 'Pendiente',
}
```

La alternativa de cambiar el dominio para que no use `'Cancelado'` en `paymentStatus` requeriría repensar la lógica de negocio y posiblemente agregar un campo separado, lo que implica un cambio mayor. Se recomienda la corrección mínima en el schema.

Adicionalmente, ejecutar una migración para actualizar todos los documentos existentes que tengan `paymentStatus: 'Cancelado'` (para que queden explícitamente válidos) y considerar agregar `runValidators: true` a las operaciones de escritura como protección futura.

---

# Final Recommendations

## Orden recomendado de corrección

| Orden | Issue | Autor | Severidad | Dependencias |
|-------|-------|-------|-----------|-------------|
| 1 | `paymentStatus` incompatible con schema | MacDuki | 🔴 | Ninguna |
| 2 | Falta de atomicidad cupón-turno | Fran | 🔴 | Ninguna |
| 3 | No se eliminan imágenes Cloudinary | Fran | 🟠 | Requiere modificar schema de User (agregar `cloudinaryPublicId`) |
| 4 | N+1 queries en membresías | Fran | 🟠 | Puede resolverse junto con #5 y #6 |
| 5 | Parámetro `search` ignorado | Fran | 🟠 | Se beneficia de la misma refactorización que #4 (MembershipController) |
| 6 | Sin paginación en membresías | Fran | 🟠 | Puede resolverse junto con #4 y #5 |
| 7 | Memory leak en ImageUpload | Fran | 🟠 | Ninguna |
| 8 | Sin rate limiting en membresías | Fran | 🟡 | Ninguna |
| 9 | `accept="image/*"` permisivo | Fran | 🟡 | Ninguna |
| 10 | Rango de fechas hardcodeado | Fran | 🟡 | Ninguna |
| 11 | `clientId!` assertion incorrecta | Fran | 🟢 | Ninguna |

## Dependencias entre correcciones

- Los issues #4, #5 y #6 (N+1, search, paginación) operan sobre los mismos archivos (`MembershipController.ts`, `MongoMembershipRepository.ts`). Se recomienda abordarlos en una sola refactorización para evitar conflictos de merge y garantizar coherencia en la solución.
- El issue #3 (Cloudinary delete) depende de una modificación previa al schema de User para almacenar el `public_id`. Debe planificarse la migración de datos de usuarios existentes.
- Los issues #1 y #2 son independientes entre sí pero ambos bloquean el merge a producción.

## Áreas de alto riesgo que merecen pruebas de regresión

- **Flujo de creación y cancelación de turnos:** Cualquier cambio en `CreateAppointmentUseCase` o `CancelAppointmentUseCase` (issues #1 y #2) afecta el core del sistema. Probar creación con `memberPass`, cancelación, NoShow, y reconfirmación.
- **Administración de membresías:** Cambios en el controller y repositorio de membresías (issues #4, #5, #6) afectan la página `/admin/membresias`.
- **Subida y actualización de avatar:** Cambios en Cloudinary y ImageUpload (issues #3, #7, #9) afectan la página de perfil y la gestión de barberos.
- **Rate limiting:** Si se aplica mal, puede bloquear operaciones legítimas del admin.

## Escenarios de prueba manual sugeridos

1. **Crear turno con memberPass en condiciones normales.** Verificar que el cupón se canjea y el turno se crea correctamente.
2. **Cancelar turno pagado con memberPass.** Verificar que el cupón se restaura y el turno cambia a cancelado.
3. **Enviar dos solicitudes de creación simultáneas para el mismo horario con memberPass.** Verificar que solo un turno se crea y que uno de los cupones no se pierde.
4. **Subir foto de perfil, luego subir otra.** Verificar que la imagen anterior se elimina de Cloudinary.
5. **Buscar cliente por nombre en el modal de creación de membresía.** Verificar que los resultados se filtran correctamente.
6. **Navegar por páginas de membresías.** Verificar que la paginación funciona y los totales son correctos.
7. **Seleccionar archivos BMP, TIFF, SVG en ImageUpload.** Verificar que el frontend los rechaza antes de enviar al backend.

## Pruebas automatizadas sugeridas para prevenir regresiones

1. **Unit test: `Appointment.cancel()` y `Appointment.markNoShow()`** deben asignar `paymentStatus` como `'Cancelado'`. Verificar que el valor es consistente con el enum del schema.
2. **Integration test: crear turno con memberPass + simular fallo en creación.** Verificar que el cupón no queda canjeado (rollback o estado consistente).
3. **Integration test: cancelar turno + simular fallo en restauración.** Verificar que el turno no queda cancelado si el cupón no se restaura.
4. **API test: `GET /api/memberships?page=2&limit=10`** verificar estructura paginada.
5. **API test: `GET /api/memberships?search=john`** verificar filtrado correcto.
6. **Component test: ImageUpload** verificar que revoca Blob URLs al cambiar archivo o desmontarse.
7. **API test: `POST /api/memberships/redeem` con llamadas rápidas sucesivas.** Verificar rate limiting.
8. **Contract test: `ImageUpload` acepta solo los mismos formatos que el backend.**

## Mejoras arquitectónicas para reducir la recurrencia

1. **Sesiones/transacciones de MongoDB:** Establecer como estándar del proyecto que toda operación que modifique dos o más colecciones debe usar transacciones. Documentar el patrón en una guía de contribución.
2. **Validación cruzada dominio-schema:** Agregar una prueba de integración que compare los valores del enum del schema de Mongoose contra los valores del tipo de dominio. Esto detectaría automáticamente desincronizaciones como la del issue #1.
3. **Paquete de tipos compartidos:** Extraer los tipos compartidos entre frontend y backend a un paquete interno del monorepo (ej. `packages/shared-types`). Esto eliminaría la duplicación manual y garantizaría que frontend y backend siempre usen los mismos contratos.
4. **Middleware de paginación unificado:** Crear un middleware de paginación reutilizable que cualquier controlador pueda usar, garantizando una interfaz consistente en todos los endpoints listables.
5. **Linter personalizado para Blob URLs:** Agregar una regla de linter (ESLint) que advierta cuando se usa `URL.createObjectURL` sin un `URL.revokeObjectURL` correspondiente en el mismo scope o en un cleanup.
6. **Auditoría de rate limiting:** Incluir en el checklist de revisión de nuevas rutas la verificación de que tengan rate limiting configurado, especialmente rutas mutativas.

---

*Documento generado el 2026-07-05 a partir de `AUDITORIA_RAMA_MEMBRESIAS.md` y `AUDITORIA_ORIGEN_HALLAZGOS.md`.*
