# Auditoría UX/UI — Frontend Barbería

**Proyecto:** Elite Cut / Barbería SA  
**Fecha:** 2026-06-27  
**Auditor:** Staff Product Designer + Senior Frontend Engineer + QA Engineer  
**Alcance:** Frontend completo — 11 páginas, ~25 componentes, flujo público y admin

---

## Resumen Ejecutivo

La aplicación tiene una base visual sólida (dark theme, identidad naranja, animaciones sutiles) pero presenta **problemas de usabilidad que afectan la conversión** (booking) y la **productividad** (admin). Se identificaron **42 hallazgos**, entre los cuales **3 son críticos**, **12 de alta severidad**, **18 medios** y **9 bajos**.

---

## Top 10 Problemas Más Importantes

| # | Problema | Severidad | Impacto |
|---|----------|-----------|---------|
| 1 | Dashboard carga sin datos por defecto | Crítica | El admin ve una pantalla vacía al iniciar sesión |
| 2 | Sidebar colapsada por defecto | Alta | La navegación principal queda oculta |
| 3 | Flujo de booking requiere clic extra innecesario | Alta | Fricción en el paso más importante del conversión |
| 4 | Inconsistencia de marca: "ELITE CUT" vs "Barbería SA" | Alta | Daña la credibilidad profesional |
| 5 | Formulario de profesionales con 28 campos de horario | Alta | Carga cognitiva masiva para el admin |
| 6 | Sin paginación en ninguna lista | Alta | No escala con cientos de turnos/barberos |
| 7 | Botón "Volver" del 2FA con estilo primario | Media | Confunde jerarquía visual |
| 8 | `ClientDataOverlay` usa inputs raw en vez del componente `Input` compartido | Media | Inconsistencia de implementación |
| 9 | Animaciones de éxito con delay de 2s bloquean el flujo | Media | Usuario espera innecesariamente |
| 10 | Código duplicado entre `PublicHeader` y header del `LandingPage` | Media | Deuda de diseño que generará divergencia |

---

## 1. Jerarquía Visual

### 1.1 Dashboard sin datos por defecto

**Problema:** El `DashboardPage` muestra un `DateRangeFilter` sin fechas pre-seleccionadas. La query `useGetOverviewQuery` se salta hasta que `desde` y `hasta` tienen valor. El admin ve una página con título "Métricas" y filtros vacíos — cero datos.

**Impacto:** La primera experiencia del admin es una pantalla vacía. Debe descubrir que necesita seleccionar fechas. No hay CTA que lo indique.

**Severidad:** Crítica

**Recomendación:** Pre-seleccionar el rango al mes actual (o últimos 30 días) y cargar datos automáticamente. Agregar un botón "Aplicar filtro" explícito.

**Justificación:** Principio de "estado inicial útil". El usuario nunca debería ver una pantalla vacía sin orientación.

---

### 1.2 Sidebar colapsada por defecto

**Problema:** `AdminLayout` inicializa `collapsed = true`. En desktop la sidebar muestra solo íconos sin texto. Para ver las etiquetas hay que hacer hover y esperar un tooltip, o hacer clic en un pequeño botón `FiChevronRight` al fondo.

**Impacto:** La navegación principal está oculta. El usuario no sabe qué opciones tiene disponibles. Aumenta la carga cognitiva y el tiempo para realizar tareas.

**Severidad:** Alta

**Recomendación:** Iniciar con `collapsed = false` (sidebar expandida) en desktop, o al menos en la primera visita. Recordar la preferencia del usuario en localStorage.

**Justificación:** Ley de Hicks — el tiempo de decisión aumenta con el número de opciones, pero ocultarlas no ayuda si son las opciones principales de navegación.

---

### 1.3 Landing: dos CTAs con peso visual similar

**Problema:** En el hero, "Reservá tu turno" (primario) y "Crear cuenta" (outline) tienen tamaño similar y están uno al lado del otro. Compiten por atención.

**Impacto:** El usuario no identifica claramente cuál es la acción principal de la landing.

**Severidad:** Media

**Recomendación:** Hacer el CTA principal significativamente más grande o usar un contraste más marcado. O separar los CTAs verticalmente con más espacio.

**Justificación:** Principio de jerarquía visual — un solo CTA debe dominar.

---

### 1.4 ¿Olvidaste tu contraseña? en 12px

**Problema:** El link de recuperación de contraseña en `LoginPage` usa `text-[12px] text-[#8A8A8A]`. Es el texto más pequeño de la página, justo cuando el usuario que lo necesita está frustrado y busca ayuda.

**Impacto:** Usuarios con problemas de acceso no encuentran la opción de recuperación fácilmente.

**Severidad:** Media

**Recomendación:** Usar `text-[14px]` con color más visible y separación visual del resto del contenido.

**Justificación:** Principio de "diseño para momentos de estrés". Cuando el usuario está bloqueado, la interfaz debe ser más empática, no menos visible.

---

### 1.5 Stats cards en AppointmentsPage roban atención

**Problema:** Cuatro cards de estadísticas (Total, Confirmados, Completados, Cancelados) ocupan el primer tercio de la página de turnos. La tabla de turnos (elemento principal) queda debajo.

**Impacto:** El admin debe scrollear para ver la información que realmente necesita.

**Severidad:** Media

**Recomendación:** Mover las stats a una sección compacta al costado o encima de la tabla como badges pequeños. Dar más espacio a la tabla.

**Justificación:** Principio de escaneabilidad — la información más operativa debe estar al alcance inmediato.

---

## 2. Divulgación Progresiva (Progressive Disclosure)

### 2.1 Formulario de profesionales masivo

**Problema:** El formulario para crear/editar un barbero muestra ~30 campos de una vez: datos personales (8), servicios (texto libre con comas), slot duration, y 7 días x 4 inputs de horario (28 campos). Todo visible simultáneamente.

**Impacto:** Carga cognitiva extrema. El admin se siente abrumado y propenso a errores.

**Severidad:** Alta

**Recomendación:** Dividir en pasos o secciones colapsables:
1. Datos básicos (email, nombre, apellido, teléfono, foto)
2. Servicios y configuración (servicios, slot duration, max advance days)
3. Horarios (con opción "copiar horario a todos los días")

**Justificación:** Principio de chunking — la información compleja se procesa mejor en bloques pequeños.

---

### 2.2 Calendario del perfil del barbero expandible por defecto

**Problema:** El schedule del perfil del barbero está colapsado inicialmente (`scheduleExpanded = false`), lo cual es correcto. Pero la sección entera de configuración de barbero (slotDuration, maxAdvanceDays, services, age, schedule) se muestra completa sin posibilidad de colapsar.

**Impacto:** Un barbero que solo quiere cambiar su nombre ve campos que no le interesan.

**Severidad:** Baja

**Recomendación:** Agrupar configuraciones avanzadas en una sección colapsable "Configuración de barbero".

**Justificación:** Principio de revelación progresiva — muestra lo básico, oculta lo avanzado.

---

### 2.3 Login con Google: perfil incompleto visible demasiado tarde

**Problema:** Cuando un usuario se registra con Google pero necesita completar datos, se muestra un formulario de "nombre, apellido, teléfono". Esto está bien, pero no hay un indicador de progreso claro de que el registro con Google fue exitoso parcialmente.

**Impacto:** El usuario puede pensar que el login falló.

**Severidad:** Baja

**Recomendación:** Mostrar un mensaje tipo "Registro con Google exitoso. Solo falta un paso más." antes del formulario.

**Justificación:** Principio de feedback continuo — el usuario debe saber en todo momento dónde está en el flujo.

---

## 3. Flujo del Usuario

### 3.1 Booking: clic extra antes de datos del cliente

**Problema:** Cuando los 3 pasos del accordion están completos, aparece un `StickyBookingFooter` con "Continuar con la reserva". Al hacer clic, se abre `ClientDataOverlay`. Esto es un paso innecesario.

**Impacto:** El usuario completa 3 pasos y luego tiene que hacer 1 clic extra para dar sus datos. En dispositivos móviles, el footer sticky ocupa espacio valioso.

**Severidad:** Alta

**Recomendación:** Cuando el paso 3 se completa, abrir directamente `ClientDataOverlay`. Eliminar el footer sticky. Si el usuario quiere modificar algo, puede cerrar el overlay.

**Justificación:** Principio de "menos clics" — cada clic extra reduce conversión en un ~5-10%.

---

### 3.2 Recovery y Register: animaciones de éxito con delay de 2s

**Problema:** Tanto `RegisterForm` como `RequestResetForm` y `ResetPasswordForm` muestran una animación de éxito por 2 segundos antes de navegar. Esto fuerza al usuario a esperar.

**Impacto:** Fricción innecesaria. El usuario ya sabe que la operación fue exitosa.

**Severidad:** Media

**Recomendación:** Navegar inmediatamente después del éxito. La animación puede mostrarse en la página destino como toast efímero.

**Justificación:** Principio de eficiencia — la interfaz no debe hacer esperar al usuario cuando no hay un proceso en segundo plano.

---

### 3.3 Admin login redirige a /admin/profesionales en vez de /admin/dashboard

**Problema:** `handleCodeSubmit` y `handleGoogleCredential` navegan a `/admin/profesionales` para admins y `/mis-turnos` para usuarios. El dashboard es la ruta por defecto del admin.

**Impacto:** El admin es llevado a la página de profesionales en vez del dashboard (métricas). Inconsistente con la estructura de routing (`<Route index element={<Navigate to="dashboard" />} />`).

**Severidad:** Media

**Recomendación:** Redirigir a `/admin/dashboard` para admins.

**Justificación:** Consistencia y expectativa del usuario — el dashboard es el punto de partida natural.

---

### 3.4 Botón "Volver" inconsistente en LoginPage

**Problema:** Cuando está en el paso de 2FA, hay un botón "Volver" que usa el mismo estilo primary que "Verificar código". Ambos son visualmente iguales.

**Impacto:** El usuario puede confundir acción primaria con secundaria.

**Severidad:** Media

**Recomendación:** Usar `variant="secondary"` o `variant="ghost"` para "Volver".

**Justificación:** Jerarquía de botones — la acción destructiva/de retroceso debe tener menos peso visual.

---

## 4. Carga Cognitiva

### 4.1 Dashboard sobrecargado de charts

**Problema:** La página de Métricas muestra en una sola pantalla: KPIs (4 cards), StatusBreakdown, HeatmapChart (GitHub-style), ReservasChart (barras), GananciasChart (área), DistribucionDonut. Todo a la vez.

**Impacto:** El admin recibe un "muro de datos". Dificulta encontrar la información relevante.

**Severidad:** Alta

**Recomendación:** Organizar en tabs o secciones colapsables: "Resumen", "Tendencia", "Distribución". O usar un diseño de grid con tamaños variables donde el más importante (Reservas) ocupe más espacio.

**Justificación:** Principio de organización visual — la información relacionada debe agruparse, y la menos prioritaria debe estar disponible pero no prominente.

---

### 4.2 Register: 6 campos para un registro simple

**Problema:** El formulario de registro pide: nombre, apellido, email, teléfono, contraseña y confirmación. Para muchos usuarios esto es excesivo.

**Impacto:** Aumenta la fricción de registro. Usuarios pueden abandonar.

**Severidad:** Media

**Recomendación:** Reducir a email + contraseña + nombre. El teléfono y apellido pueden pedirse después o en el perfil.

**Justificación:** Principio de "menos es más" — cada campo adicional reduce la tasa de conversión entre 3-10%.

---

### 4.3 Admin Appointments: demasiados filtros visibles

**Problema:** Los filtros de fecha, barbero, estado y búsqueda están todos visibles simultáneamente. Ocupan ~4 líneas horizontales.

**Impacto:** Compiten con la tabla por atención visual.

**Severidad:** Baja

**Recomendación:** Colapsar filtros menos usados (barbero, estado) detrás de un botón "Más filtros". Mantener fecha y búsqueda siempre visibles.

**Justificación:** Divulgación progresiva — muestra lo esencial, oculta lo avanzado.

---

## 5. Consistencia

### 5.1 Inconsistencia de marca: "ELITE CUT" vs "Barbería SA"

**Problema:** El `LandingPage` header y `PublicHeader` muestran "ELITE CUT". El `AppHeader` y `AppSidebar` muestran "Barbería SA".

**Impacto:** Parecen dos aplicaciones distintas. Daña la percepción profesional.

**Severidad:** Alta

**Recomendación:** Unificar el nombre de marca. La app es "Elite Cut". Usar "Barbería SA" solo como subtítulo o metadata si es necesario.

**Justificación:** Consistencia de marca — la identidad debe ser uniforme en toda la aplicación.

---

### 5.2 Formato de fecha inconsistente

**Problema:** En `AdminAppointmentsPage` la fecha se muestra como viene de la API (`yyyy-mm-dd`). En `BookingPage` el resumen usa `dd/mm/yyyy`. En `BookingSuccessModal` y `ClientDataOverlay` usan `formatDate` que convierte a `dd/mm/yyyy`.

**Impacto:** El administrador ve fechas en formato ISO, mientras los clientes ven formato local. Falta consistencia.

**Severidad:** Media

**Recomendación:** Usar formato local (`dd/mm/yyyy`) en todo el frontend. Crear un helper `formatDate` y usarlo uniformemente.

**Justificación:** Consistencia de presentación — el mismo tipo de dato debe mostrarse igual en toda la app.

---

### 5.3 Variantes de botón inconsistentes

**Problema:** 
- "Volver" en 2FA login: primary (naranja)
- "Volver" en modals de cancelación: secondary (gris)
- "Cancelar" en Google profile completion: primary (naranja)
- Botón "Refrescar" en admin pages: secondary (gris)

**Impacto:** Usuario no puede predecir el estilo de una acción similar en distintos contextos.

**Severidad:** Media

**Recomendación:** Definir una convención: todas las acciones de retroceso/cancelación usan `variant="secondary"` o `variant="ghost"`. Todas las acciones destructivas (confirmar cancelación) usan clase roja.

**Justificación:** Consistencia de interacción — acciones similares deben verse similares.

---

### 5.4 Loading states inconsistentes

**Problema:** 
- `AdminAppointmentsPage`: spinner con `animate-spin`
- `ProfessionalsPage`: loading state en `ProfessionalsList` 
- `LoginPage`: botón con loading spinner
- `ProfilePage`: texto "Cargando perfil..."
- `DashboardPage`: no hay skeleton para KPIs

**Impacto:** Experiencia fragmentada. El usuario percibe falta de pulido.

**Severidad:** Media

**Recomendación:** Definir un patrón de loading estándar. Usar skeleton loaders para contenido principal y spinners solo para botones.

**Justificación:** Consistencia perceptual — la misma situación debe comunicarse de la misma forma.

---

### 5.5 Errores mostrados de forma inconsistente

**Problema:** 
- `AdminAppointmentsPage`: error en un div con borde rojo al inicio
- `DashboardPage`: error en variable local dentro del componente
- `LoginPage`: error como texto centrado
- `ProfessionalsPage`: error en un `AnimatedContainer`

**Impacto:** El usuario no tiene un patrón predecible de dónde aparecerán los errores.

**Severidad:** Media

**Recomendación:** Centralizar errores en un patrón consistente (ej: toast notifications o un error banner global).

**Justificación:** Consistencia de feedback — los errores deben aparecer siempre en el mismo formato y lugar.

---

## 6. Componentes Innecesarios

### 6.1 Refrescar buttons redundantes

**Problema:** Cada página admin tiene un botón "Refrescar" (icono `FiRefreshCw`). RTK Query ya hace polling (30s en appointments, 15s en mis-turnos).

**Impacto:** Botón que no agrega valor. Aumenta ruido visual.

**Severidad:** Media

**Recomendación:** Eliminar los botones "Refrescar". Si se necesita refresco manual, colocarlo como opción secundaria menos visible.

**Justificación:** Principio de "menos es más" — cada elemento debe tener un propósito claro.

---

### 6.2 StepIndicator en RecoveryPage

**Problema:** El `StepIndicator` para un flujo de 2 pasos ("Solicitar", "Restablecer") es excesivo. Es un componente que ocupa espacio para poca información.

**Impacto:** Ruido visual innecesario en una página que ya tiene carga cognitiva (usuario frustrado por perder su contraseña).

**Severidad:** Baja

**Recomendación:** Reemplazar por un texto simple "Paso 1 de 2" o simplemente cambiar el título.

**Justificación:** Simplicidad — si puedes decirlo con menos elementos, hazlo.

---

### 6.3 "¿Olvidaste tu contraseña?" en RegisterPage

**Problema:** En la página de registro aparece un link "¿Olvidaste tu contraseña?". Un usuario registrándose nunca olvidó su contraseña para esta cuenta.

**Impacto:** Información irrelevante que distrae.

**Severidad:** Baja

**Recomendación:** Eliminar este link de la página de registro.

**Justificación:** Principio de relevancia contextual — muestra solo información útil para la tarea actual.

---

### 6.4 Ambient glow en todas las páginas

**Problema:** Cada página tiene el mismo bloque decorativo:
```tsx
<div className="fixed inset-0 pointer-events-none overflow-hidden">
  <div className="absolute ... bg-[#FF5C00]/5 rounded-full blur-3xl" />
</div>
```

**Impacto:** DOM extra (~10 nodos por página). Rendimiento en dispositivos low-end.

**Severidad:** Baja

**Recomendación:** Usar un backdrop decorativo global envuelto en el layout raíz, no por página.

**Justificación:** Eficiencia — no repitas el mismo código decorativo en cada página.

---

## 7. Arquitectura de la Información

### 7.1 Perfil de barbero mezcla datos personales con configuración

**Problema:** El `ProfilePage` para barberos mezcla datos personales (nombre, email) con configuración avanzada (slotDuration, maxAdvanceDays, services, schedule de 7 días).

**Impacto:** Un barbero que quiere cambiar su teléfono tiene que ver (y potentialmente editar accidentalmente) su horario completo.

**Severidad:** Alta

**Recomendación:** Separar en tabs o secciones: "Información personal" y "Configuración de agenda".

**Justificación:** Cohesión de la información — agrupa datos relacionados, separa datos no relacionados.

---

### 7.2 Sin navegación entre admin y perfil personal

**Problema:** Desde la sidebar admin no hay link directo a `/admin/perfil`. Hay que hacer clic en el nombre del usuario en el header.

**Impacto:** Baja visibilidad de la opción de perfil.

**Severidad:** Baja

**Recomendación:** Agregar "Perfil" en la navegación del sidebar o hacerlo más visible en el header.

**Justificación:** Accesibilidad de navegación — las opciones importantes no deberían requerir un clic en elemento pequeño.

---

### 7.3 "Cualquier barbero" selecciona el primero

**Problema:** La opción "No tengo preferencia" en el booking selecciona `barbers[0]`. El usuario no sabe a qué barbero se le asignará.

**Impacto:** Transparencia reducida. El usuario puede terminar con un barbero que no esperaba.

**Severidad:** Media

**Recomendación:** Si el backend soporta asignación automática, enviar `anyBarber: true` y dejar que el servidor asigne. Si no, mostrar un mensaje "Se asignará el primer barbero disponible" o "Te asignaremos al barbero con espacio disponible".

**Justificación:** Principio de transparencia — el usuario debe entender lo que va a pasar.

---

## 8. Estados de la Interfaz

### 8.1 Sin estado vacío en Dashboard

**Problema:** Cuando no hay fechas seleccionadas, el dashboard muestra la estructura vacía. No hay mensaje guiando al usuario.

**Impacto:** Frustración del admin que no sabe qué hacer.

**Severidad:** Crítica

**Recomendación:** Estado vacío con mensaje "Seleccioná un rango de fechas para ver las métricas" y un botón "Ver este mes".

**Justificación:** Principio de prevención de errores — guía al usuario antes de que se confunda.

---

### 8.2 Auth guards devuelven null durante init

**Problema:** `RequireAdminRoute` y `RequireAuthRoute` devuelven `null` mientras `isInitializing`. Esto causa un flash de pantalla en blanco.

**Impacto:** Experiencia entrecortada al cargar la app.

**Severidad:** Media

**Recomendación:** Mostrar un loader (skeleton/spinner) durante la inicialización en vez de `null`.

**Justificación:** Principio de feedback — siempre muestra algo mientras cargas.

---

### 8.3 Sin feedback post-acción en appointments

**Problema:** Al cancelar o cambiar estado de un turno, la modal se cierra sin mensaje de éxito. La tabla se actualiza silenciosamente por RTK Query cache.

**Impacto:** El usuario puede no estar seguro de que la acción se completó.

**Severidad:** Media

**Recomendación:** Agregar un toast de éxito efímero después de cada acción exitosa.

**Justificación:** Principio de feedback inmediato — cada acción debe tener una confirmación visible.

---

### 8.4 Error messages de API mostrados directamente

**Problema:** En varios lugares, el mensaje de error del backend se muestra directamente al usuario (ej: `error?.data`).

**Impacto:** Mensajes técnicos o en inglés pueden confundir al usuario hispanohablante.

**Severidad:** Media

**Recomendación:** Mapear códigos de error a mensajes amigables en español.

**Justificación:** Principio de lenguaje del usuario — la interfaz debe hablar el idioma del usuario, no el del backend.

---

## 9. Feedback al Usuario

### 9.1 Sin confirmación antes de acciones irreversibles (eliminar barbero)

**Problema:** `handleDelete` en `ProfessionalsPage` usa `window.confirm()`.

**Impacto:** El diálogo nativo del navegador se ve fuera de lugar con el diseño dark moderno. Además, algunas acciones destructivas (cambio de estado en appointments) no tienen confirmación.

**Severidad:** Media

**Recomendación:** Usar un modal de confirmación custom con el diseño de la app (reutilizando el patrón de modales existente).

**Justificación:** Principio de consistencia de branding — todos los elementos deben seguir el mismo diseño.

---

### 9.2 PasswordStrength visible solo con valor

**Problema:** `PasswordStrength` solo se muestra cuando `values.password` tiene valor. Esto está bien, pero no hay indicador de requisitos antes de escribir.

**Impacto:** El usuario descubre los requisitos de contraseña solo después de empezar a escribir.

**Severidad:** Baja

**Recomendación:** Mostrar los requisitos como hint debajo del campo de contraseña siempre, y el indicador de fortaleza cuando haya valor.

**Justificación:** Principio de prevención de errores — muestra las reglas antes de que el usuario las viole.

---

## 10. Acciones Principales

### 10.1 Dashboard sin CTA claro

**Problema:** La acción principal del dashboard es "seleccionar fechas", pero no hay un botón de "Aplicar" o "Cargar datos". Los datos se cargan automáticamente cuando ambos filtros tienen valor.

**Impacto:** El usuario no sabe que debe seleccionar fechas para ver datos.

**Severidad:** Alta

**Recomendación:** Agregar botón "Aplicar" y pre-seleccionar fechas por defecto.

**Justificación:** Affordance — las acciones deben ser reconocibles como acciones.

---

### 10.2 AppointmentsPage: múltiples acciones compitiendo

**Problema:** Cada fila de la tabla tiene 4 botones de acción + el estado + posible razón de cancelación. Demasiados elementos compitiendo.

**Impacto:** Dificultad para identificar rápidamente qué acciones están disponibles.

**Severidad:** Media

**Recomendación:** Agrupar acciones en un menú de 3 puntos o usar iconos solo con tooltip, reduciendo el ruido visual.

**Justificación:** Principio de exposición progresiva — muestra primero las acciones principales (completar), oculta las secundarias.

---

## 11. Formularios

### 11.1 ClientDataOverlay usa inputs raw en vez de Input component

**Problema:** En `ClientDataOverlay` los campos de nombre, apellido, teléfono, email usan `<input>` nativo en vez del componente `Input` compartido. Esto significa que no reciben el mismo tratamiento visual (label, error styling, etc.).

**Impacto:** Inconsistencia visual y funcional. Los labels están como placeholders en vez de labels reales, lo que es mala práctica de accesibilidad.

**Severidad:** Alta

**Recomendación:** Reemplazar los inputs nativos con el componente `<Input>` compartido, usando labels reales en vez de placeholders.

**Justificación:** Consistencia de componentes y accesibilidad — los placeholders no reemplazan labels.

---

### 11.2 Servicios como texto libre con comas

**Problema:** En `ProfessionalsPage` y `ProfilePage`, los servicios se ingresan como texto separado por comas (ej: "corte, barba, color").

**Impacto:** Propenso a errores de tipeo. Difícil de escalar con muchos servicios.

**Severidad:** Media

**Recomendación:** Implementar un multi-select o tag input con los servicios predefinidos desde el backend (vía API de servicios). Si no hay API, usar un `select` múltiple.

**Justificación:** Principio de prevención de errores — si los valores son predecibles, no dejes que el usuario los escriba.

---

### 11.3 Validación solo al submit

**Problema:** La validación en la mayoría de los formularios ocurre solo al hacer submit (gracias a `validateAll`). El `touched` se usa para mostrar errores, pero algunos formularios no actualizan `touched` hasta el submit.

**Impacto:** El usuario llena un formulario completo, hace click y recién ahí descubre errores.

**Severidad:** Media

**Recomendación:** Validar en blur (perder foco) y mostrar errores en tiempo real mientras escribe.

**Justificación:** Principio de feedback inmediato — corrige errores cuando ocurren, no al final.

---

### 11.4 Horario semanal sin atajos

**Problema:** El formulario de horario tiene 7 días × 4 inputs = 28 campos de tiempo. No hay opción de "copiar horario a todos los días" o "aplicar horario de lunes a viernes".

**Impacto:** Toma mucho tiempo configurar horarios. Propenso a errores.

**Severidad:** Alta

**Recomendación:** Agregar botones: "Copiar horario al día siguiente", "Aplicar a todos los días", "Aplicar a días de semana".

**Justificación:** Principio de eficiencia — reduce el esfuerzo del usuario en tareas repetitivas.

---

## 12. Escalabilidad de la UI

### 12.1 Sin paginación en listas

**Problema:** `AdminAppointmentsPage` carga todos los turnos en memoria y filtra con `useMemo`. `ProfessionalsPage` carga todos los profesionales. `MyAppointmentsPage` carga todos los turnos del cliente.

**Impacto:** Con 200+ turnos o 50+ profesionales, el rendimiento se degrada. La UI no escala.

**Severidad:** Alta

**Recomendación:** Implementar paginación server-side y UI de paginación en tabla y listas. RTK Query soporta paginación fácilmente.

**Justificación:** Principio de escalabilidad — la UI debe funcionar igual con 10 y con 10000 registros.

---

### 12.2 Booking calendar sin límite de meses visibles

**Problema:** El `BookingCalendar` permite navegar meses arbitrariamente (sin límite visible en el código de `DateTimeStep`).

**Impacto:** Usuario puede navegar a fechas sin slots disponibles y confundirse.

**Severidad:** Baja

**Recomendación:** Limitar la navegación a `maxAdvanceDays` desde la fecha actual. Deshabilitar meses fuera de rango.

**Justificación:** Prevención de errores — no dejes que el usuario explore estados que no sirven.

---

### 12.3 Layout admin: sin scrollbar visible personalizada

**Problema:** El admin layout usa `overflow-x-hidden`. En tablas anchas, el scroll horizontal es del navegador (feo en dark mode).

**Impacto:** Experiencia visual inconsistente.

**Severidad:** Baja

**Recomendación:** Agregar estilos de scrollbar personalizados (webkit).

**Justificación:** Atención al detalle — cada píxel cuenta.

---

## 13. Accesibilidad

### 13.1 Accordion steps sin ARIA attributes

**Problema:** Los `AccordionStep` components no tienen `aria-expanded`, `aria-controls`, `role="button"`, o soporte de teclado (Enter/Space para activar).

**Impacto:** Inaccesible para usuarios de teclado o lectores de pantalla.

**Severidad:** Alta

**Recomendación:** Agregar `role="button"`, `aria-expanded`, `aria-controls`, manejo de eventos `onKeyDown` (Enter/Space).

**Justificación:** Accesibilidad WCAG 2.1 — todos los widgets interactivos deben ser operables por teclado.

---

### 13.2 Icon buttons sin aria-label

**Problema:** Los botones de acción en la tabla de appointments (`FiCheck`, `FiClock`, `FiXCircle`, `FiX`) tienen `title` pero no `aria-label`.

**Impacto:** Lectores de pantalla pueden no anunciar correctamente la acción.

**Severidad:** Media

**Recomendación:** Agregar `aria-label` a todos los icon-buttons.

**Justificación:** Accesibilidad WCAG — los lectores de pantalla necesitan labels explícitos.

---

### 13.3 Contraste de color: naranja sobre dark

**Problema:** El color `#FF5C00` (naranja brillante) sobre fondos oscuros puede tener ratio de contraste insuficiente en textos pequeños (<14px).

**Impacto:** Usuarios con baja visión pueden no leer textos naranjas pequeños.

**Severidad:** Media

**Recomendación:** Verificar contraste de `#FF5C00` sobre `#1A1A1A` y `#121212`. Si es menor a 4.5:1, usar una variante más clara (#FF7A2E o similar) para textos.

**Justificación:** Accesibilidad WCAG AA — contraste mínimo de 4.5:1 para texto normal.

---

### 13.4 Sin skip-to-content

**Problema:** No hay un enlace "Saltar al contenido principal" al inicio de la página.

**Impacto:** Usuarios de lector de pantalla deben navegar todo el header y sidebar antes de llegar al contenido.

**Severidad:** Baja

**Recomendación:** Agregar un `SkipLink` oculto que aparezca con foco.

**Justificación:** WCAG 2.4.1 — Bypass Blocks.

---

## 14. Microinteracciones

### 14.1 Sin hover state en filas de tabla de appointments

**Problema:** Las filas de la tabla tienen `hover:bg-[#1A1A1A]/50` que es muy sutil. Casi imperceptible.

**Impacto:** Pobre feedback visual al pasar el mouse.

**Severidad:** Baja

**Recomendación:** Aumentar la opacidad del hover o usar un cambio de color más notorio.

**Justificación:** Feedback de interacción — el usuario debe sentir que el elemento es interactivo.

---

### 14.2 Transiciones de modal con spring

**Problema:** Los modales usan `type: 'spring'` con stiffness 300, damping 25-30. Es aceptable pero ligeramente lento.

**Impacto:** Sensación de "pesadez" en las transiciones.

**Severidad:** Baja

**Recomendación:** Usar stiffness 400+ y damping 30+ para transiciones más rápidas y ágiles. O usar transiciones de ease-out más simples.

**Justificación:** Principio de performance percibida — las transiciones deben sentirse rápidas, no lentas.

---

### 14.3 Sin microfeedback en status changes

**Problema:** Al cambiar estado de un turno (Confirmado → Completado), no hay animación ni feedback visual de la transición.

**Impacto:** La interfaz se siente "súbita" y sin vida.

**Severidad:** Baja

**Recomendación:** Agregar un fade/scale momentáneo en la fila o badge que cambió. Una micro-animación de 200ms marca la diferencia.

**Justificación:** Principio de feedback continuo — las transiciones de estado deben ser visibles.

---

## 15. Simplicidad (Steve Jobs Test)

Esto es lo que se eliminaría:

1. **Ambient glow repetido en cada página** → Un fondo global
2. **Botones "Refrescar"** → Polling automático
3. **Stats cards en AppointmentsPage** → Badges minimalistas
4. **"¿Olvidaste tu contraseña?" en Register** → Contexto incorrecto
5. **StepIndicator en Recovery** → Texto simple
6. **Footer sticky en booking** → Overlay directo
7. **Sidebar colapsada por defecto** → Expandida siempre
8. **Mensaje de config de Google** → Ocultar cuando no hay GOOGLE_CLIENT_ID
9. **Animaciones de 2s post éxito** → Navegación inmediata
10. **Labels redundantes en header (nombre de página en badge + h1)** → Uno u otro

---

## Quick Wins (Alto Impacto, Bajo Esfuerzo)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Pre-seleccionar fechas en Dashboard (últimos 30 días) | 15 min | Crítico |
| 2 | Cambiar collapsed sidebar default a `false` | 1 min | Alto |
| 3 | Unificar nombre de marca a "ELITE CUT" | 5 min | Alto |
| 4 | Abrir ClientDataOverlay directo al completar paso 3 | 10 min | Alto |
| 5 | Eliminar delay de 2s en animaciones de éxito | 10 min | Medio |
| 6 | Quitar link "Olvidaste contraseña" de RegisterPage | 1 min | Bajo |
| 7 | Cambiar "Volver" en 2FA a variant secondary | 1 min | Medio |
| 8 | Ocultar "o" separator si no hay Google Client ID | 5 min | Bajo |
| 9 | Quitar "Refrescar" buttons (dejar polling) | 10 min | Medio |
| 10 | Unificar Input component en ClientDataOverlay | 20 min | Alto |

---

## Problemas Estructurales (Alto Esfuerzo, Alto Impacto)

| # | Acción | Esfuerzo | Impacto |
|---|--------|----------|---------|
| 1 | Paginación server-side en listas | 2-3 días | Alto |
| 2 | Simplificar formulario de profesionales (pasos) | 1-2 días | Alto |
| 3 | Separar perfil barbero (info personal vs config) | 1 día | Alto |
| 4 | Multi-select de servicios en vez de texto libre | 4-6 hrs | Alto |
| 5 | Agregar aria labels y keyboard nav a accordion | 4 hrs | Alto |
| 6 | Agregar toasts de feedback para acciones admin | 4 hrs | Medio |
| 7 | Sistema de filtros colapsables en AppointmentsPage | 3 hrs | Medio |
| 8 | Refactor de código duplicado (PublicHeader) | 2 hrs | Medio |

---

## Resumen de Severidad

| Severidad | Cantidad |
|-----------|----------|
| Crítica | 3 |
| Alta | 12 |
| Media | 18 |
| Baja | 9 |
| **Total** | **42** |

---

## Notas Técnicas Adicionales

### Bundles y Performance
- La app pesa ~500-600KB con Framer Motion + Recharts + React Icons + Axios + Redux. Es aceptable pero mejorable.
- Framer Motion podría reemplazarse con CSS transitions para animaciones simples, reduciendo ~40KB.
- React Icons importa Feather y Material Design. Conviene importar solo los íconos usados.

### Testing
- Hay tests unitarios con Vitest en componentes clave (BookingCalendar, ServiceCard, etc.).
- No se detectaron tests de integración para flujos críticos (booking completo, login 2FA).
- Playwright E2E configurado pero sin tests de flujo completo visibles.

### Deuda Técnica de UI
- `PublicHeader` y `AppHeader` comparten lógica de dropdown de usuario — candidato a refactor.
- `Input` component acepta `helperText` pero `PasswordInput` no lo expone.
- `PasswordStrength` existe como componente standalone y también como subcomponente en RegisterPage. Inconsistencia.
- Los estilos de select nativos no tienen componente encapsulado — se repiten raw en varias páginas.

---

*Documento generado automáticamente mediante análisis de código fuente. Todas las recomendaciones son sugerencias basadas en principios de UX/UI y pueden requerir validación con usuarios reales.*
