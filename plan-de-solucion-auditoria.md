# Plan de Solución — Auditoría UX/UI

**Proyecto:** Elite Cut / Barbería SA  
**Archivo fuente:** `auditoria-ux-ui.md`  
**Criterios:** Se resuelven todos los puntos excepto los ignorados (1.1, 1.2, 1.3, 1.4, 3.4, 4.2, 5.1, 6.2, 10.1, 11.2, 13.3, 13.4)

---

El plan se divide en **10 fases**, cada una corresponde a una iteración del modelo. Están ordenadas para construir patrones compartidos antes de usarlos, agrupar cambios por archivo/página, y mantener cada fase con una carga manejable (2–7 items). Cada fase se puede implementar, verificar y committear de forma independiente.

---

## Fase 1 — Quick Wins

**Items:** 2.3, 6.1, 6.3, 6.4, 14.1, 14.2, 14.3  
**Dependencias:** Ninguna  
**Complejidad:** Baja  

Cambios pequeños y aislados que no requieren nueva infraestructura. Sirven como calentamiento y liberan items triviales rápido.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **6.1** | Eliminar botones "Refrescar" (`FiRefreshCw`) de páginas admin | `AdminAppointmentsPage/index.tsx`, `ProfessionalsPage/index.tsx`, `MyAppointmentsPage/index.tsx` |
| **6.3** | Eliminar link "¿Olvidaste tu contraseña?" de RegisterPage | `RegisterPage/index.tsx` |
| **6.4** | Mover ambient glow al layout raíz en vez de repetirlo en cada página | `App.tsx` (root layout), más páginas que lo tengan |
| **2.3** | Agregar mensaje informativo tras login con Google exitoso | Componente de completado de perfil Google |
| **14.1** | Aumentar opacidad hover en filas de tabla appointments | `AdminAppointmentsPage/index.tsx` |
| **14.2** | Ajustar spring params de modales (stiffness 400+, damping 30+) | Modales que usen framer-motion spring |
| **14.3** | Agregar micro-animación fade/scale en badges al cambiar estado | `AdminAppointmentsPage/index.tsx` |

---

## Fase 2 — Sistema de Feedback al Usuario

**Items:** 5.5, 5.3, 8.3, 9.1  
**Dependencias:** Ninguna (se construye infraestructura nueva)  
**Complejidad:** Media  

Crea la infraestructura de feedback: toast notifications, convención de botones, y modal de confirmación reusable. Todo lo demás se apoya en estos patrones.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **5.5** | Crear componente `Toast` y centralizar visualización de errores. Reemplazar divs con borde rojo y `AnimatedContainer` por el nuevo patrón | `components/common/Toast.tsx` (nuevo), `AdminAppointmentsPage`, `DashboardPage`, `LoginPage`, `ProfessionalsPage` |
| **5.3** | Definir y aplicar convención global de variantes de botón (secondary/ghost para cancelar, rojo para destructivo, primary para acción principal) | Todos los componentes con botones |
| **8.3** | Agregar toast de éxito (2-3s) después de cada acción en appointments | `AdminAppointmentsPage/index.tsx` |
| **9.1** | Reemplazar `window.confirm()` por modal de confirmación custom con diseño dark. Aplicar también a cambios de estado destructivos | `ProfessionalsPage/index.tsx`, `AdminAppointmentsPage/index.tsx` |

---

## Fase 3 — Estados de Interfaz

**Items:** 5.4, 8.2, 8.1  
**Dependencias:** Fase 2 (usa botones del 5.3 para el empty state)  
**Complejidad:** Media  

Unifica los loading states, elimina el flash de pantalla en blanca de auth guards, e implementa empty state en Dashboard.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **5.4** | Definir patrón de loading estándar (skeleton para contenido principal, spinner inline en botones, spinner centrado para páginas). Reemplazar loading states actuales | `AdminAppointmentsPage`, `ProfessionalsPage`, `LoginPage`, `ProfilePage`, `DashboardPage` |
| **8.2** | Reemplazar `null` en `RequireAdminRoute` y `RequireAuthRoute` durante `isInitializing` por un spinner/skeleton | `App.tsx` (auth guards inline) |
| **8.1** | Implementar empty state con mensaje y botón "Ver este mes" en Dashboard | `DashboardPage/index.tsx` |

---

## Fase 4 — Fechas y Formularios

**Items:** 5.2, 11.1, 11.3  
**Dependencias:** Fase 2 (11.1 usa el `Input` component existente, pero también usa el patrón de error toast si aplica)  
**Complejidad:** Media  

Unifica formato de fecha y mejora el `ClientDataOverlay` con el `Input` component compartido y validación en blur.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **5.2** | Crear helper `formatDate` para `dd/mm/yyyy`. Reemplazar formatos inline en todos los componentes que muestren fechas | `utils/formatFecha.ts`, `AdminAppointmentsPage`, `BookingPage`, `BookingSuccessModal`, `ClientDataOverlay`, otros |
| **11.1** | Reemplazar `<input>` nativos por `<Input>` component en `ClientDataOverlay`. Agregar labels reales | `components/client/booking/ClientDataOverlay.tsx` |
| **11.3** | Configurar validación en blur y errores en tiempo real. Ajustar manejo de `touched` | `ClientDataOverlay.tsx` (y hook `useFormValidation` si aplica) |

---

## Fase 5 — Flujo de Booking y Navegación

**Items:** 3.1, 3.2, 3.3, 7.2  
**Dependencias:** Fase 2 (3.2 puede usar toast de éxito de la Fase 2)  
**Complejidad:** Media  

Mejora el flujo de booking (elimina clic extra), corrige delays de navegación, arregla redirect de admin login, y agrega navegación a perfil.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **3.1** | Al completar paso 3 de booking, abrir `ClientDataOverlay` directamente sin pasar por `StickyBookingFooter`. Eliminar footer sticky | `BookingPage/index.tsx`, `StickyBookingFooter.tsx` |
| **3.2** | Navegar inmediatamente tras operación exitosa en Recovery y Register. Mostrar toast en destino en lugar de animación blocking de 2s | `RecoveryPage/index.tsx`, `RegisterPage/index.tsx` |
| **3.3** | Cambiar redirect post-login admin de `/admin/profesionales` a `/admin/dashboard` en `handleCodeSubmit` y `handleGoogleCredential` | `LoginPage/index.tsx` (o servicio de auth) |
| **7.2** | Agregar ítem "Perfil" en sidebar del admin o agrandar área cliqueable del nombre de usuario en header | `components/sidebar/AppSidebar.tsx`, `components/common/AppHeader.tsx` |

---

## Fase 6 — Dashboard y Visualización de Datos

**Items:** 1.5, 4.1, 4.3, 10.2  
**Dependencias:** Fase 3 (usa los skeleton loaders para los charts)  
**Complejidad:** Media-Alta  

Reorganiza el dashboard, reemplaza stats cards, colapsa filtros, y agrupa acciones de tabla.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **1.5** | Reemplazar 4 cards de estadísticas por badges compactos sobre la tabla. La tabla debe ocupar el espacio principal | `AdminAppointmentsPage/index.tsx` |
| **4.1** | Organizar charts del dashboard en tabs ("Resumen", "Tendencia", "Distribución") o grid con tamaños variables | `DashboardPage/index.tsx` y sus componentes |
| **4.3** | Colapsar filtros de barbero y estado detrás de botón "Más filtros". Mantener fecha y búsqueda siempre visibles | `AdminAppointmentsPage/index.tsx` |
| **10.2** | Agrupar acciones de cada fila de tabla en menú de 3 puntos (`...`) o iconos con tooltip | `AdminAppointmentsPage/index.tsx` |

---

## Fase 7 — Divulgación Progresiva y Perfil

**Items:** 2.1, 2.2, 7.1, 7.3  
**Dependencias:** Fase 2 (usa las variantes de botón y modal)  
**Complejidad:** Alta  

Aplica el principio de divulgación progresiva a los formularios más grandes y al perfil del barbero.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **2.1** | Dividir formulario de profesionales en 3 pasos/secciones colapsables: (1) Datos básicos, (2) Servicios y configuración, (3) Horarios. Agregar navegación e indicador de progreso | `ProfessionalsPage/components/ProfessionalForm.tsx` |
| **2.2** | Agrupar configuración avanzada del barbero (slotDuration, maxAdvanceDays, services, age, schedule) en sección colapsable "Configuración de barbero". Por defecto colapsada | `ProfilePage/index.tsx` |
| **7.1** | Separar `ProfilePage` en tabs: "Información personal" y "Configuración de agenda" | `ProfilePage/index.tsx` |
| **7.3** | Mostrar mensaje "Se asignará el primer barbero disponible" cuando se selecciona "Cualquier barbero" | Componente de selección de barbero en booking |

---

## Fase 8 — Escalabilidad

**Items:** 12.1, 12.2, 12.3  
**Dependencias:** Ninguna directa (la paginación toca los mismos archivos de fases anteriores pero es independiente)  
**Complejidad:** Alta  

Paginación server-side en las listas principales, límite de navegación en calendario, y scrollbar personalizada para el dark theme.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **12.1** | Implementar paginación server-side con UI (números de página, anterior/siguiente) en `AdminAppointmentsPage`, `ProfessionalsPage` y `MyAppointmentsPage` | `AdminAppointmentsPage`, `ProfessionalsPage`, `MyAppointmentsPage` (y sus queries RTK Query) |
| **12.2** | Limitar navegación del `BookingCalendar` a `maxAdvanceDays`. Deshabilitar meses fuera de rango | `components/client/booking/BookingCalendar.tsx` |
| **12.3** | Agregar estilos de scrollbar personalizados webkit para coherencia visual del dark theme | `index.css` o `App.css` |

---

## Fase 9 — Formularios Avanzados y API Errors

**Items:** 11.4, 8.4, 9.2  
**Dependencias:** Fase 7 (11.4 aplica al horario semanal del formulario de profesionales)  
**Complejidad:** Media-Alta  

Agrega atajos al horario semanal, mapea errores de API a mensajes amigables, y mejora el componente de fortaleza de contraseña.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **11.4** | Agregar botones de atajo al formulario de horarios: "Copiar horario al día siguiente", "Aplicar a todos los días", "Aplicar a días de semana" | `ProfessionalForm.tsx` (componente de horarios) |
| **8.4** | Crear mapeo de códigos de error del backend a mensajes amigables en español. Reemplazar `error?.data` directo | Servicios API + componente de error |
| **9.2** | Mostrar siempre los requisitos de contraseña como hint debajo del campo, incluso antes de escribir. Indicador de fortaleza solo cuando hay valor | `components/common/PasswordStrength.tsx`, `RegisterPage` |

---

## Fase 10 — Accesibilidad

**Items:** 13.1, 13.2  
**Dependencias:** Ninguna  
**Complejidad:** Baja  

Agrega atributos ARIA y etiquetas para lectores de pantalla.

| Item | Descripción | Archivos principales |
|------|-------------|---------------------|
| **13.1** | Agregar `role="button"`, `aria-expanded`, `aria-controls` y manejo de teclado (Enter/Space) a `AccordionStep` | `components/client/booking/AccordionStep.tsx` |
| **13.2** | Agregar `aria-label` a icon-buttons de acciones en tabla de appointments (`FiCheck`, `FiClock`, `FiXCircle`, `FiX`) | `AdminAppointmentsPage/index.tsx` |

---

## Resumen de Dependencias entre Fases

```
Fase 1 (Quick Wins)          → sin dependencias
Fase 2 (Feedback)             → sin dependencias
Fase 3 (Estados)              → depende de Fase 2 (botones en empty state)
Fase 4 (Fechas y Forms)       → depende de Fase 2 (Input component, toast)
Fase 5 (Booking y Nav)        → depende de Fase 2 (toast en 3.2)
Fase 6 (Dashboard)            → depende de Fase 3 (skeleton loaders)
Fase 7 (Divulgación Progres.) → depende de Fase 2 (botones y modal)
Fase 8 (Escalabilidad)        → sin dependencias
Fase 9 (Form Avanzados)       → depende de Fase 7 (horarios en ProfessionalForm)
Fase 10 (Accesibilidad)       → sin dependencias
```

Las fases **1, 2, 8 y 10** se pueden ejecutar en paralelo. Las fases **3, 4, 5, 7** necesitan que la Fase 2 esté completa. La **Fase 6** necesita la Fase 3. La **Fase 9** necesita la Fase 7.
