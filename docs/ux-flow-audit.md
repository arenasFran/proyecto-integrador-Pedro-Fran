# Auditoría de flujo de usuario (UX/UI)

## Resumen ejecutivo

Se realizó una auditoría integral del flujo de usuario de la aplicación Barbería, recorriendo todas las rutas, componentes de navegación, botones, enlaces y redirecciones tanto para usuarios autenticados como no autenticados. Se detectaron **4 problemas funcionales** (2 críticos, 1 medio, 1 bajo). Todos fueron corregidos. Además se identificaron **2 hallazgos adicionales** que se documentan como recomendaciones.

---

## Lista de problemas encontrados

### UX-001: Botón "Reservar turno" en Mis turnos redirige a Landing en vez de al flujo de reserva

| Campo | Valor |
|---|---|
| **Pantalla / Flujo** | MyAppointmentsPage (`/mis-turnos`) — estado vacío |
| **Problema** | El botón "Reservar turno" en el empty state usaba `window.location.href = '/'` en lugar de navegar al flujo de reserva (`/reservar`). |
| **Impacto** | **Crítico** — El usuario no podía completar el flujo de reserva desde la pantalla de Mis turnos. Llegaba a la Landing Page en vez de al booking flow. |
| **Causa raíz** | Uso incorrecto de `window.location.href` + ruta destino incorrecta (`/` en vez de `/reservar`). |
| **Solución aplicada** | Se importó `useNavigate` de react-router-dom, se reemplazó `window.location.href = '/'` por `navigate('/reservar')`, y se actualizó el texto del empty state para reflejar la nueva navegación. |
| **Archivos modificados** | `src/pages/client/MyAppointmentsPage/index.tsx` |
| **Líneas** | 2, 26, 125-127 |

### UX-002: RecoveryPage usa hard redirect en vez de SPA navigation

| Campo | Valor |
|---|---|
| **Pantalla / Flujo** | RecoveryPage (`/recovery`) — post reset exitoso |
| **Problema** | `handleResetSuccess` usaba `window.location.href = '/login'` causando un full page reload. |
| **Impacto** | **Medio** — Inconsistente con el resto de la app (todas las demás navegaciones usan `navigate()`). Causa recarga innecesaria y pérdida de estado Redux al llegar al Login. |
| **Causa raíz** | Hard redirect en vez de SPA navigation. |
| **Solución aplicada** | Se importó `useNavigate` y se reemplazó por `navigate('/login')`. |
| **Archivos modificados** | `src/pages/public/RecoveryPage/index.tsx` |
| **Líneas** | 3, 30, 38-40 |

### UX-003: Sin página 404 — rutas inexistentes muestran pantalla en blanco

| Campo | Valor |
|---|---|
| **Pantalla / Flujo** | Toda la app — rutas no definidas |
| **Problema** | No existía un catch-all `*` route. Cualquier URL inválida (ej: `/mi-perfil`, `/turnos`, `/admin/xyz`) mostraba una pantalla en blanco. |
| **Impacto** | **Bajo** — El usuario no recibe feedback ante URLs incorrectas o enlaces rotos. |
| **Causa raíz** | Falta de ruta comodín en el router. |
| **Solución aplicada** | Se creó `NotFoundPage` con el mismo tema oscuro (fondo `#050505`, acento `#FF5C00`) y botón "Volver al inicio". Se agregó `<Route path="*" element={<NotFoundPage />} />` en App.tsx. |
| **Archivos modificados** | `src/pages/public/NotFoundPage/index.tsx` (nuevo), `src/App.tsx` |
| **Líneas** | App.tsx: líneas 13, 66 |

### UX-004: API 401 interceptor usa hard redirect

| Campo | Valor |
|---|---|
| **Pantalla / Flujo** | API — cualquier llamada con token expirado y refresh fallido |
| **Problema** | El interceptor de axios en `api.ts` usa `window.location.href = '/login'` al fallar el refresh token. |
| **Impacto** | **Bajo** — Es una práctica estándar en interceptores porque no hay acceso al contexto de React Router. La recarga completa al llegar a `/login` es intencional (limpia estado). |
| **Solución aplicada** | No se modificó. Se documenta como comportamiento esperado. |
| **Archivos modificados** | Ninguno |

---

## Hallazgos adicionales (recomendaciones)

### H-001: Sin página de perfil para clientes

Los clientes autenticados no tienen una página para editar sus datos personales (nombre, email, teléfono). La única página de perfil es `/admin/perfil` para administradores. Se recomienda crear una ruta `/mi-perfil` con un formulario de edición de datos para clientes.

### H-002: LandingPage y PublicHeader duplican lógica de dropdown de autenticación

Tanto `LandingPage/index.tsx` como `PublicHeader.tsx` implementan la misma lógica condicional para mostrar el dropdown del usuario autenticado. Se podría extraer a un componente compartido (`AuthDropdown`) para evitar duplicación.

---

## Correcciones aplicadas — resumen de archivos

| Archivo | Cambio |
|---|---|
| `src/pages/client/MyAppointmentsPage/index.tsx` | Se agregó `useNavigate`, se cambió `window.location.href` por `navigate('/reservar')`, se actualizó texto del empty state |
| `src/pages/public/RecoveryPage/index.tsx` | Se agregó `useNavigate`, se cambió `window.location.href` por `navigate('/login')` |
| `src/pages/public/NotFoundPage/index.tsx` | **Nuevo** — Página 404 con diseño consistente |
| `src/App.tsx` | Se agregó import de `NotFoundPage` y ruta catch-all `<Route path="*" />` |

---

## Estado final

- **TypeScript**: 0 errores
- **ESLint**: 0 errores (1 warning pre-existente en RequestResetForm)
- **Tests**: 119/119 pasan
- **Build**: OK (Vite)
