# Pull Request — Mejoras UX/UI, Analytics y Turnos

> **Rama:** `fix/ux-ui-problems`
> **Base:** `develop`
> **Commits:** ~155

---

## Resumen

Esta PR agrupa los cambios de la rama `fix/ux-ui-problems` contra `develop`. Incluye un nuevo módulo completo de **analytics/métricas** con dashboard, mejoras significativas en la gestión de **turnos** (paginación, búsqueda, filtros, acciones contextuales, modal de detalle), y decenas de mejoras de **UX/UI** en componentes compartidos.

---

## 1. Analytics y Métricas (Dashboard)

### Backend — Nuevos endpoints
| Endpoint | Descripción |
|---|---|
| `GET /api/analytics/charts/horas` | Distribución horaria de turnos |
| `GET /api/analytics/charts/dias-semana` | Distribución por día de semana |
| `GET /api/analytics/charts/clientes-recurrentes` | Tasa de retorno de clientes |
| `GET /api/analytics/charts/ingresos-servicio` | Ingresos agrupados por servicio |
| `GET /api/analytics/clientes` | Lista de clientes (registrados y anónimos) |
| `GET /api/analytics/clientes/:clientKey/turnos` | Historial de turnos de un cliente |
| `GET /api/analytics/overview` | Overview con `ingresosPendientes` agregado |

### Backend — Arreglos
- **`MongoAnalyticsRepository.ts`**: Corrección en la detección de clientes anónimos — `$group` devuelve `null` (no `'missing'`) cuando el campo no existe, lo que impedía identificar correctamente los `NoRegistrado`. Se cambió la comparación de `undefined` a `null` y se usó `$type` en los `$cond` del `_id` del `$group` para detectar campos ausentes.
- Se agregó un `console.error` en `getClientesList` para debuggear errores.
- Seed de analytics expandido de 15 a 45 perfiles anónimos para simular mayor recurrencia.

### Frontend — Nuevas cards y charts
- **KpiCards**: Cards clickeables para Reservas, Ingresos, Ingresos Pendientes, Nuevos Clientes, con modales de detalle:
  - IncomeBreakdownModal: desglose por barbero
  - PendingIncomeModal: lista de turnos con pago pendiente
  - NewClientsModal: contadores nuevos/registrados/anónimos, lista de clientes, botón "Ver todos"
- **DistribucionDonut**: ahora muestra ticket promedio
- **BarberComparisonTable**: tabla comparativa por barbero (turnos, ingresos, ticket promedio)
- **RevenueByServiceChart**: barras horizontales por servicio con ingresos y cantidades
- **HourDistributionChart**: badges de horas pico
- **DayOfWeekChart**: barras por día de semana
- **StatusBreakdown**: movido debajo de KpiCards
- **ClientHistoryModal**: historial de turnos por cliente
- **ClientsPage**: página completa con lista, búsqueda y filtro por fechas
- **Eliminada** la "Tendencia semanal" del modal de nuevos clientes por resultar confusa

### Frontend — Tipos y API
- Nuevos tipos `HoraEntry`, `DiaSemanaEntry`, `ClientesRecurrentesData`, `IngresoServicioEntry`, `ClienteData`, `ClientAppointmentEntry`
- Nuevos hooks RTK Query: `useGetHorasQuery`, `useGetDiasSemanaQuery`, `useGetClientesRecurrentesQuery`, `useGetIngresosPorServicioQuery`, `useGetClientesListQuery`, `useGetClientAppointmentsQuery`

---

## 2. Gestión de Turnos (Appointments)

### Backend — Nuevos endpoints de acciones contextuales
| Endpoint | Método | Descripción |
|---|---|---|
| `/api/appointments/:id/payment` | `PATCH` | Marcar como pagado |
| `/api/appointments/:id/send-reminder` | `POST` | Enviar recordatorio |
| `/api/appointments/:id/change-barber` | `PATCH` | Cambiar barbero |

### Backend — Correcciones
- `paymentStatus` ahora soporta `'Cancelado'` (se asigna al cancelar/marcar NoShow)
- Se quitó el auto-pago al completar turno; se respeta el `paymentStatus` de la entidad
- `ingresosPendientes` ahora excluye turnos Cancelado/NoShow y filtra por `paymentStatus`
- `statusHistory` se actualiza correctamente al reprogramar
- Se agregó `optimistic locking` y sort de slots al backend

### Frontend — Modal de detalle (`AppointmentDetailModal`)
- Timeline visual del historial de estados
- Acciones contextuales: Completar, Pagar, Cambiar barbero, Reprogramar, Enviar recordatorio, Cancelar
- Modal combinado completar + pago
- Dropdown de acciones simplificado

### Frontend — Filtros y búsqueda
- Filtro por método de pago y `paymentStatus`
- Búsqueda server-side por nombre/apellido/email/servicio
- Filtros colapsables
- Exportar a CSV
- Migración de filtros a URL search params
- Presets de fechas con `DateRangeFilter` mejorado

### Frontend — Paginación
- Paginación en vista admin (`AdminAppointmentsPage`)
- Paginación en vista cliente (`MyAppointmentsPage`)
- Componente `Pagination` reutilizable
- Backend: `limit`, `page`, `totalPages` en respuesta de appointments y barbers

### Frontend — Vista mobile
- Cards reemplazan a la tabla en mobile
- Botones icon-only debajo del contenido

### Frontend — FAB movido a navbar
- Botón "Nuevo turno" en la navbar del admin

---

## 3. Componentes Compartidos y UX

### Nuevos componentes
| Componente | Descripción |
|---|---|
| `DatePicker` | Calendario popup reutilizable con formato dd/mm/yyyy |
| `Select` | Dropdown personalizado estilizado |
| `Modal` | Header condicional, padding reducido |
| `Toast` | Sistema de notificaciones con contexto provider |
| `ConfirmModal` | Diálogo de confirmación reutilizable |
| `Spinner` | Loader spinner |
| `Pagination` | Paginación reutilizable |
| `BarberAvatar` | Avatar de barbero con iniciales |
| `ImageUpload` | Subida de imágenes |
| `AppointmentListModal` | Modal genérico para listas de turnos |
| `StatsCards` | Cards de estadísticas (extraído a componente compartido) |

### Mejoras UX/UI
- **DateRangeFilter**: mejorado con `skipMountEffect`, `detectPreset`, sincronización con DatePicker
- **PasswordStrength**: requisitos siempre visibles, movido a `components/common`
- **Error mapping**: `getErrorMessage` unifica el parseo de errores del servidor
- **Registro**: navegación inmediata a login con toast de éxito (elimina pantalla de éxito intermedia)
- **Login**: redirect admin a `/admin/dashboard`
- **Sidebar**: item Perfil, link a profesionales, enlace Agendar para usuarios
- **Scrollbar**: estilos custom para tema oscuro
- **Mobile**: layout responsive en header, stats, tabs del dashboard
- **Ambient glow**: movido al layout raíz
- **Botones Refrescar**: eliminados de páginas admin
- **Link "Olvidaste contraseña"**: eliminado de RegisterPage
- **Spring params**: modales con stiffness 400+, damping 30+
- **ARIA**: atributos de accesibilidad en icon-buttons y AccordionStep

### Fixes
- TS errors pre-existentes resueltos (imports no usados)
- `AppError` movido de `application/errors/` a `domain/errors/` para respetar Clean Architecture
- `new: true` deprecated eliminado, `partialFilterExpression` agregado en appointments

---

## 4. Tests

### Backend
- Tests de repositorio para nuevos métodos de analytics (`mongo-analytics.repository.test.ts`)
- Tests de integración de rutas para analytics
- Tests de nuevos use-cases (`UpdatePaymentStatusUseCase`, etc.)
- Adaptación de tests existentes a cambios (`paymentStatus`, paginación, nuevos tipos)

### Frontend
- Tests de hooks RTK Query (`analyticsApi.test.ts`, `appointmentApi.test.ts`)
- Tests de componentes: `HourDistributionChart`, `DayOfWeekChart`, `BarberComparisonTable`, `RevenueByServiceChart`, `AppointmentDetailModal`
- Fix de tests afectados por cambios en `DateRangeFilter`, `Toast`, `RegisterForm`
- Test utils mejorados con `ToastProvider` wrapper

---

## Archivos modificados

- **226 archivos cambiados**
- **~11,870 líneas agregadas**
- **~3,746 líneas eliminadas**

### Backend (`backend-barber/`)
- `MongoAnalyticsRepository.ts` — métodos de agregación y fix de detección anónimos
- `MongoAppointmentRepository.ts` — paginación, búsqueda, filtros
- `MongoBarberRepository.ts` — paginación
- `AnalyticsController.ts` — nuevos endpoints
- `AppointmentController.ts` — acciones contextuales, paginación, búsqueda
- `BarberController.ts` — paginación, activar/desactivar
- `Appointment.ts` — `PaymentStatus.Cancelado`, `barberName`, `barberPhotoUrl`
- `appointment.ts` types — `PaymentStatus.Cancelado`
- `seed-analytics.ts` — 45 perfiles anónimos
- Tests: +6 suites nuevas

### Frontend (`frontend-barber/`)
- `DashboardPage/` — KpiCards, 4 nuevos charts, StatusBreakdown, ClientsHistoryModal, ChartFilters
- `ClientsPage/` — página completa de clientes
- `AppointmentsPage/` — AppointmentDetailModal, paginación, filtros, búsqueda, export CSV, vista mobile
- `ProfessionalsPage/` — wizard modal de 3 pasos, paginación, activar/desactivar
- `components/common/` — DatePicker, Select, Toast, ConfirmModal, Spinner, Pagination, StatsCards, BarberAvatar, ImageUpload, AppointmentListModal
- `analyticsApi.ts` — nuevos endpoints RTK Query
- `appointmentApi.ts` — nuevas mutations (markAsPaid, sendReminder, changeBarber, createAppointment)
- `barbersSlice.ts` — paginación, activar/desactivar
- Tests: +10 suites nuevas
