# Auditoría de Integración del Sistema

## Resumen Ejecutivo

| Indicador | Valor |
|-----------|-------|
| Nivel de integración general | **62/100** |
| Riesgo del sistema | **ALTO** |
| Calidad del dominio | **Media-Alta** |
| Consistencia de métricas | **BAJA** |

**Conclusión**: La arquitectura de dominio (Clean Architecture) es sólida y las integraciones entre pagos, órdenes, turnos y membresías a nivel transaccional funcionan correctamente. Sin embargo, el **dashboard de analytics ignora completamente los ingresos por membresías**, subestima ingresos de turnos (solo cuenta Completados, no Pagados) y omite métricas clave como membresías activas y clientes únicos. Esto significa que **el dashboard no refleja la realidad del negocio** y las decisiones basadas en él serán incorrectas.

---

## Dashboard

### KPI 1: Reservas (Total Bookings)

| Aspecto | Detalle |
|---------|---------|
| Propósito | Mostrar total de reservas en el período |
| Origen de datos | `AppointmentModel.aggregate()` - cuenta **todos** los appointments sin filtrar por status |
| Módulos involucrados | Turnos (exclusivamente) |
| Cálculo | `Backend`: `$facet → totalReservas: [{ $count: 'count' }]` en `MongoAnalyticsRepository.ts:121` |
| **Problemas** | El contador incluye turnos Cancelados y NoShow. La etiqueta "Reservas" implica reservas activas, pero el número incluye cancelaciones |
| Integraciones faltantes | Ninguna - es correcto que solo cuente turnos |
| Impacto | **MEDIO** - El número total es inflado artificialmente por cancelaciones. El subtítulo "Reservas" es engañoso si no se contextualiza con la tasa de cancelación |

### KPI 2: Ingresos Totales

| Aspecto | Detalle |
|---------|---------|
| Propósito | Mostrar ingresos totales del período |
| Origen de datos | 1) `AppointmentModel` (solo Completados) + 2) `PaymentModel` (solo `type: 'product_order'` + `status: 'approved'`) |
| Módulos involucrados | Turnos + Ecommerce |
| Cálculo | `Backend`: Línea 188 en `MongoAnalyticsRepository.ts`: `((data.ingresosTotales)[0]?.total ?? 0) + (productRevenue[0]?.total ?? 0)` |
| **Problemas** | **CRÍTICO**: No incluye ingresos por membresías. `type: 'membership'` nunca se consulta en analytics. Solo incluye appointments `Completado` como revenue - appointments `Confirmado` con pago `Pagado` online NO cuentan. `Frontend`: `IncomeBreakdownModal` en `KpiCards.tsx:24-72` solo muestra Turnos + Productos, sin Membresías. |
| Integraciones faltantes | `type: 'membership'` en `PaymentModel` debe agregarse a todas las agregaciones de revenue |
| Impacto | **CRÍTICO** - La línea de ingresos por membresías es invisible, subestimando ingresos totales. Dependiendo del volumen de membresías, el error puede ser significativo. Los turnos pagados online pero aún no completados tampoco aparecen. |

### KPI 3: Ingresos Pendientes

| Aspecto | Detalle |
|---------|---------|
| Propósito | Mostrar ingresos aún no cobrados |
| Origen de datos | 1) Appointments con `paymentStatus: 'Pendiente'` + status en `countsAsDuration` (Confirmado, Completado) + 2) `PaymentModel` payments `type: 'product_order'` + `status: 'pending'` |
| Módulos involucrados | Turnos + Ecommerce |
| Cálculo | `Backend`: Líneas 130-133 + línea 157 en `MongoAnalyticsRepository.ts` |
| **Problemas** | **ALTO**: No incluye membresías pendientes de pago. Solo considera turnos con paymentStatus Pendiente - no considera pagos online pendientes de confirmación de MP. El `PendingIncomeModal` en frontend (`KpiCards.tsx:145-218`) solo consulta appointments con `paymentStatus: 'Pendiente'`, omitiendo pagos de membresías y órdenes pendientes. |
| Integraciones faltantes | Membresías con status `pending` deben contribuir a ingresos pendientes. Pagos `in_process`/`pending` de MP también |
| Impacto | **ALTO** - Ingresos pendientes subestimados. Negocio no tiene visibilidad completa de cuentas por cobrar |

### KPI 4: Tasa de Cancelación

| Aspecto | Detalle |
|---------|---------|
| Propósito | Mostrar porcentaje de cancelaciones |
| Origen de datos | Frontend calcula: `(cancelado + noshow + cancelled_order) / (totalReservas + total_orders) * 100` |
| Módulos involucrados | Turnos + Ecommerce |
| Cálculo | `Frontend`: `KpiCards.tsx:260-268` |
| **Problemas** | **MEDIO**: Combina cancelaciones de turnos y órdenes en una sola tasa, diluyendo el significado. Una tasa de cancelación de turnos es muy diferente a una de órdenes (diferentes causas de negocio). Las membresías canceladas o expiradas no se contabilizan en ninguna tasa. |
| Integraciones faltantes | Separar tasa de cancelación de turnos y de órdenes en métricas independientes |
| Impacto | **MEDIO** - Métrica compuesta que no permite identificar dónde está el problema |

### KPI 5: Nuevos Clientes

| Aspecto | Detalle |
|---------|---------|
| Propósito | Mostrar clientes nuevos registrados en el período |
| Origen de datos | `Client` collection (incluye `Registrado` y `NoRegistrado`), filtrado por `_id` creation timestamp |
| Módulos involucrados | Clientes/Usuarios |
| Cálculo | `Backend`: `MongoAnalyticsRepository.ts:144-148` - usa `REGISTERED_AT_STAGE` que convierte `_id` a fecha. La colección `Client` usa discriminadores de Mongoose e incluye ambos tipos. `getNuevosClientes()` en línea 399-418 devuelve el campo `kind` con `{ $ifNull: ['$kind', 'NoRegistrado'] }`. El `NewClientsModal` en frontend (`KpiCards.tsx:79-142`) desglosa correctamente entre Registrado y Anónimo. |
| **Problemas** | **NINGUNO** - Decisión de negocio: "nuevo cliente" = ficha creada en el período, no primera visita. Los clientes anónimos YA están incluidos porque la colección `Client` contiene tanto `Registrado` como `NoRegistrado`. |
| Integraciones faltantes | Ninguna |
| Impacto | **SIN IMPACTO** - Funciona según la definición de negocio acordada |

### KPI 6: Clientes Recurrentes (Tasa de Retorno) — **ELIMINAR**

| Aspecto | Detalle |
|---------|---------|
| Propósito | Mostrar porcentaje de clientes que vuelven |
| Estado | **Debe eliminarse del dashboard** |
| Decisión | Se removió la KPI card "Clientes recurrentes" por decisión de negocio. Ya no debe mostrarse en el dashboard principal. |
| Acción requerida | Eliminar la card `clientesRecurrentes` del array `CARDS_CONFIG` en `KpiCards.tsx:220-229` y remover el query `useGetClientesRecurrentesQuery` asociado. El endpoint backend puede mantenerse si se usa en otra vista. |

### KPI 7: Órdenes Totales

| Aspecto | Detalle |
|---------|---------|
| Propósito | Mostrar total de órdenes ecommerce en el período |
| Origen de datos | `OrderModel` filtrado por `createdAt` |
| Módulos involucrados | Ecommerce |
| Cálculo | `Backend`: `getEcommerceOverview()` línea 759 |
| **Problemas** | **BAJO**: Métrica correcta y aislada. Incluye todos los estados |
| Integraciones faltantes | Ninguna |
| Impacto | **BAJO** - Funciona correctamente |

### KPI 8: Órdenes Pendientes

| Aspecto | Detalle |
|---------|---------|
| Propósito | Mostrar órdenes ecommerce pendientes de pago |
| Origen de datos | `EcommerceOverview.ordersByStatus.pending` del frontend |
| Módulos involucrados | Ecommerce |
| Cálculo | `Frontend`: `KpiCards.tsx:250` - `ecommerceData?.ordersByStatus?.pending ?? 0` |
| **Problemas** | **BAJO**: Muestra correctamente el conteo pero solo para ecommerce |
| Integraciones faltantes | Podría también mostrar membresías pendientes de aprobación |
| Impacto | **BAJO** |

---

### KPIs FALTANTES en el Dashboard

El dashboard actual carece de métricas fundamentales para el negocio:

| KPI Faltante | Gravedad | Razón | Ubicación propuesta |
|-------------|----------|-------|---------------------|
| **Membresías activas** | CRÍTICA | Siendo un producto core, no hay visibilidad de cuántas membresías activas existen | Dashboard (Overview) |
| **Ingresos por membresías por mes** | CRÍTICA | Revenue stream invisible en dashboard y gráficos de tendencia | Dashboard (gráfico de ganancias + overview) |
| **Clientes únicos atendidos** | ALTA | No se sabe cuántos clientes distintos se atendieron en el período | Dashboard (Overview) |
| **Tasa de ocupación / slots** | ALTA | No se mide la eficiencia de la agenda de barberos | Página de Barberos (CRUD), NO en dashboard |

**KPIs excluidos por decisión de negocio** (no implementar):
- ~~Tasa de conversión de pagos online~~
- ~~Tiempo promedio hasta completar pago~~
- ~~Membresías por vencer~~ (ya disponible en vista de membresías)
- ~~Ticket promedio general~~ (ya existe en Ecommerce Tab)
- ~~Clientes recurrentes~~ (eliminado del dashboard)

---

## Integraciones Correctas

Las siguientes integraciones están correctamente implementadas:

| Origen | Destino | Evento | Evidencia |
|--------|---------|--------|-----------|
| MercadoPago Webhook | Appointment | Pago aprobado → `appointment.pay()` | `ProcessWebhookUseCase.ts:321-332` |
| MercadoPago Webhook | Membership | Pago membresía → `approve()` y crear transaction | `ProcessWebhookUseCase.ts:333-368` |
| MercadoPago Webhook | Order | Pago aprobado → `order.pay()` + decremento stock + email | `ProcessWebhookUseCase.ts:370-392` |
| MercadoPago Webhook | Order | Pago rechazado → `order.cancel()` | `ProcessWebhookUseCase.ts:405-414` |
| MercadoPago Webhook | Order | Pago reembolsado → `order.refund()` + restauración stock | `ProcessWebhookUseCase.ts:427-449` |
| MercadoPago Webhook | Order | Chargeback/Mediación → `order.markAsDisputed()` | `ProcessWebhookUseCase.ts:452-473` |
| MercadoPago Preapproval | Membership | Webhook suscripción → activar/reactivar membresía + renovar | `ProcessWebhookUseCase.ts:213-318` |
| Appointment Cancel | Membership | Cancelación turno memberPass → restaurar cupón | `CancelAppointmentUseCase.ts:96-102` |
| Appointment Status Update | Membership | Cancelar/NoShow memberPass → restaurar cupón | `UpdateAppointmentStatusUseCase.ts:128-134` |
| Membership | Ecommerce Order | `productDiscount` aplicado en orden | `CreateOrderUseCase.ts:39-40, 56-58` |
| Auth Register | Client | Migración de turnos anónimos a usuario registrado | `RegisterUserUseCase.ts` |
| Appointment Create | Membership | Validación de membresía activa para `memberPass` | `CreateAppointmentUseCase.ts:117-122, 158-165` |
| Cron Job | Appointment | Cancelar turnos con pago pendiente >30min | `index.ts:47-62` |
| Cron Job | Order | Cancelar órdenes pendientes >60min | `index.ts:64-78` |
| Cron Job | Membership | Expirar membresías vencidas cada 24h | `index.ts:32-45` |

---

## Integraciones Faltantes

### IF-01: Membresías → Dashboard (Revenue)

| Atributo | Valor |
|----------|-------|
| Módulo origen | Membresías (Payments `type: 'membership'`) |
| Módulo destino | Analytics / Dashboard |
| Evento | Pago de membresía aprobado |
| Impacto | Los ingresos por membresías no aparecen en ningún KPI, gráfico o exportación CSV |
| Severidad | **CRÍTICA** |
| Archivos afectados | `MongoAnalyticsRepository.ts` (líneas 113-195 overview, 421-477 ingresos por servicio, 667-746 reservas y ganancias), `ReportsController.ts` (línea 55), `EcommerceTab.tsx`, `KpiCards.tsx` |
| Recomendación | Agregar `{ type: { $in: ['product_order', 'membership'] } }` en todas las queries de analytics que consultan `PaymentModel`. Crear una categoría "Membresías" en `getIngresosPorServicio()`. |

### IF-02: Membresías → Dashboard (Métricas de estado)

| Atributo | Valor |
|----------|-------|
| Módulo origen | Membresías (Membership collection) |
| Módulo destino | Analytics / Dashboard |
| Evento | Crear, activar, expirar, renovar membresía |
| Impacto | No existe visibilidad en dashboard de membresías activas, pendientes, expiradas, ni tendencias |
| Severidad | **ALTA** |
| Archivos afectados | `MongoAnalyticsRepository.ts` - ninguna query consulta `memberships` collection |
| Recomendación | Agregar endpoint `/analytics/memberships/overview` con conteo por estado, revenue y tendencia. Agregar un tab "Membresías" en el dashboard. |

### IF-03: Appointment Pagado → Dashboard Revenue

| Atributo | Valor |
|----------|-------|
| Módulo origen | Turnos (Appointment) |
| Módulo destino | Analytics |
| Evento | Pago de turno aprobado (webhook) |
| Impacto | Turnos con `paymentStatus: 'Pagado'` pero `status: 'Confirmado'` no cuentan como revenue hasta que alguien los marca `Completado` |
| Severidad | **ALTA** |
| Archivos afectados | `appointment.ts:21` - `countsAsRevenue: ['Completado']` |
| Recomendación | `countsAsRevenue` debería incluir `'Confirmado'` cuando `paymentStatus === 'Pagado'`, o bien cambiar la lógica a: ingresos = `paymentStatus: 'Pagado' AND status IN countsAsActivity`. Alternativa: agregar un flag `billed` que se marque automáticamente al recibir el pago. |

### IF-04: Membresías → Clientes (totalSpent)

| Atributo | Valor |
|----------|-------|
| Módulo origen | Membresías |
| Módulo destino | Analytics (Clientes List) |
| Evento | Compra/renovación de membresía |
| Impacto | `totalSpent` en lista de clientes no incluye gasto en membresías |
| Severidad | **MEDIA** |
| Archivos afectados | `MongoAnalyticsRepository.ts:479-617` - `getClientesList` agrega `orderSpending` pero no `membershipSpending` |
| Recomendación | Agregar `$lookup` a `membershiptransactions` para sumar gasto en membresías al `totalSpent` |

### IF-05: Turnos Pagados → Ecommerce Tab

| Atributo | Valor |
|----------|-------|
| Módulo origen | Turnos |
| Módulo destino | Ecommerce Tab (Productos más vendidos) |
| Evento | N/A |
| Impacto | La pestaña "Ecommerce" en dashboard solo muestra productos; los servicios de barbería (que también generan ingresos) están en tabs separados sin vista consolidada |
| Severidad | **BAJA** |
| Archivos afectados | `EcommerceTab.tsx`, estructura del dashboard |
| Recomendación | Agregar una vista unificada "Ingresos Totales" que consolide turnos + productos + membresías |

### IF-06: Exportación CSV → Membresías y Turnos

| Atributo | Valor |
|----------|-------|
| Módulo origen | Membresías, Turnos |
| Módulo destino | Reportes CSV |
| Evento | Exportación de ventas |
| Impacto | `exportSalesCsv` solo exporta `type: 'product_order'` payments. Membresías y turnos son invisibles en reportes exportables |
| Severidad | **ALTA** |
| Archivos afectados | `ReportsController.ts:52-92` |
| Recomendación | Ampliar filtro a `type: { $in: ['product_order', 'membership', 'appointment'] }` o crear exports separados por tipo |

### IF-07: Refund/Chargeback → Appointments

| Atributo | Valor |
|----------|-------|
| Módulo origen | MercadoPago Webhook |
| Módulo destino | Turnos |
| Evento | Refund, chargeback de pago de turno |
| Impacto | Si se reembolsa un pago de turno, el appointment no se actualiza (sigue en su estado actual). `handleRefunded` y `handleChargeBack` solo manejan `product_order` |
| Severidad | **ALTA** |
| Archivos afectados | `ProcessWebhookUseCase.ts:427-473` |
| Recomendación | Agregar manejo de refund/chargeback para `type: 'appointment'`: cancelar el turno y restaurar cupón de membresía si aplica. |

### IF-08: Rejected Payment → Appointments

| Atributo | Valor |
|----------|-------|
| Módulo origen | MercadoPago Webhook |
| Módulo destino | Turnos |
| Evento | Pago de turno rechazado |
| Impacto | `handleRejected` solo cancela órdenes `product_order`. Turnos con pago rechazado quedan en `Confirmado` con `paymentStatus` sin actualizar |
| Severidad | **ALTA** |
| Archivos afectados | `ProcessWebhookUseCase.ts:405-414` |
| Recomendación | Agregar manejo de rejected para `type: 'appointment'`: actualizar paymentStatus a 'Cancelado' o cancelar el turno automáticamente |

---

## Eventos sin Propagación

Eventos que ocurren pero no notifican a otros módulos:

| Evento | Módulo origen | Módulos que deberían reaccionar | Estado actual |
|--------|--------------|-------------------------------|---------------|
| Membresía activada (pago aprobado) | Payments | Dashboard, Client totalSpent | ❌ Sin propagación |
| Membresía renovada (auto-renewal) | Payments | Dashboard, Analytics | ❌ Sin propagación |
| Membresía expirada (cron job) | Memberships | Dashboard, Usuario (notificación) | ❌ Sin propagación |
| Turno NoShow | Appointments | Dashboard, Cliente (warning/flag) | ⚠️ Parcial (solo afecta query analytics por status) |
| Orden disputada (chargeback) | Payments | Dashboard, Inventario | ❌ Sin propagación a dashboard |
| Pago offline completado | Payments | Dashboard | ❌ Sin propagación (solo webhook lo actualiza) |
| Pago cancelado (expiró tiempo) | Cron Job | Analytics, Payment history | ❌ Sin actualización de analytics en tiempo real |
| Membresía creada por admin | Memberships | Payment history, Analytics | ⚠️ Crea transacción pero no metrics |
| Cupón canjeado | Memberships | Appointment | ✔️ Correcto |
| Cupón restaurado | Appointments | Memberships | ✔️ Correcto |

---

## Métricas Incorrectas

### MI-01: Ingresos Totales incompletos
- **Archivo**: `MongoAnalyticsRepository.ts:126-129, 150-153, 188`
- **Error**: Solo incluye appointments Completados + pagos product_order aprobados. Omite membresías.
- **Corrección**: Agregar `type: 'membership'` a las agregaciones de revenue. Incluir todos los pagos aprobados independientemente del tipo.

### MI-02: Ingresos Pendientes incompletos
- **Archivo**: `MongoAnalyticsRepository.ts:130-133, 157, 189`
- **Error**: Solo incluye appointments con paymentStatus Pendiente + pagos product_order pendientes. Omite membresías pendientes y pagos en proceso (MP `in_process`, `pending`).
- **Corrección**: Incluir membresías con status `pending` y pagos con status `pending` + `in_process`.

### MI-03: Ingresos por Servicio omite Membresías
- **Archivo**: `MongoAnalyticsRepository.ts:421-477`
- **Error**: `getIngresosPorServicio()` agrega "Productos" como categoría sintética pero nunca "Membresías".
- **Corrección**: Agregar query a `PaymentModel` con `type: 'membership'` para crear categoría "Membresías".

### MI-04: Reservas y Ganancias omite períodos solo-ecommerce
- **Archivo**: `MongoAnalyticsRepository.ts:742-745`
- **Error**: `getReservasGanancias()` mergea payment data sobre appointment data. Si hay ingresos de productos en un período sin turnos, no aparecen.
- **Corrección**: Hacer merge bidireccional: crear entradas para períodos que solo tienen pagos de productos.

### MI-05: Clientes totalSpent incompleto
- **Archivo**: `MongoAnalyticsRepository.ts:596-605`
- **Error**: `totalSpent` suma `servicePrice` de turnos Completados + órdenes paid/delivered. No suma membresías.
- **Corrección**: Agregar lookup a `membershiptransactions` para incluir gasto en membresías.

### MI-06: Tasa de cancelación combinada artificialmente
- **Archivo**: Frontend `KpiCards.tsx:260-268`
- **Error**: Combina cancelación de turnos y órdenes en un solo porcentaje. Períodos con muchas órdenes canceladas inflan artificialmente la tasa.
- **Corrección**: Mostrar tasas separadas: "Cancelación turnos" y "Cancelación órdenes".

### MI-07: Revenue ecommerce usa fuente inconsistente
- **Archivo**: `MongoAnalyticsRepository.ts:768-771` vs `MongoAnalyticsRepository.ts:150-153`
- **Error**: `getEcommerceOverview().totalRevenue` se calcula desde `PaymentModel` (pagos aprobados), pero los gráficos de revenue en overview incluyen solo `productRevenue`. Coherencia interna inconsistente.
- **Corrección**: Unificar fuente de verdad para revenue de ecommerce.

---

## Datos Inconsistentes

### DI-01: Estados de pago divergentes entre Appointment y Payment
- **Contexto**: Un `Appointment` tiene `paymentStatus` propio ('Pendiente', 'Pagado', 'Cancelado'). Un `Payment` (documento separado) tiene su propio `status` ('pending', 'approved', 'rejected', etc.)
- **Riesgo**: El `paymentStatus` del appointment se actualiza vía webhook (`ProcessWebhookUseCase.ts:326-329`), pero si el webhook falla o llega desordenado, appointment y payment pueden diverger.
- **Archivos**: `ProcessWebhookUseCase.ts:321-332`, `appointment.model.ts`, `payment.model.ts`

### DI-02: Stock inconsistente en órdenes locales canceladas
- **Contexto**: `CreateOrderUseCase.ts:78-83` decrementa stock inmediatamente para `paymentMethod: 'local'`. Si luego la orden se cancela manualmente, el stock no se restaura.
- **Archivos**: `CreateOrderUseCase.ts:78-83`, `Order.ts` (no tiene lógica de restauración de stock en `cancel()`)

### DI-03: Membership transactions duplicadas potenciales
- **Contexto**: `MembershipController.create()` (línea 103) crea una transacción al crear membresía. `ProcessWebhookUseCase.handleApproved()` (línea 338) también crea una transacción al aprobar membresía pendiente. Si un admin crea una membresía directa como `active: true`, la transacción existe. Si la membresía se crea como `pending` y luego el webhook la aprueba, se crea OTRA transacción adicional. Podrían duplicarse.
- **Archivos**: `MembershipController.ts:101-110`, `ProcessWebhookUseCase.ts:338-345`

### DI-04: Order "delivered" desde "pending" sin pago
- **Contexto**: `Order.deliver()` permite transición desde `pending` directamente a `delivered` sin pasar por `paid` (línea 73 en `Order.ts`: `if (this.props.status !== 'pending' && this.props.status !== 'paid')`). Esto permite entregar órdenes no pagadas.
- **Archivos**: `Order.ts:73`

---

## Edge Cases Detectados

| Escenario | Diagnóstico | Severidad |
|-----------|-------------|-----------|
| **Pago aprobado pero turno sigue Confirmado** | Revenue no refleja el pago hasta que alguien lo marque Completado. Si nunca se completa, el ingreso nunca se contabiliza en analytics. | ALTA |
| **Webhook de pago nunca llega** | El `Payment` queda en `pending`, el `Appointment` en `Confirmado` con `paymentStatus: 'Pendiente'`. El cron job cancela el turno tras 30min, pero el payment queda `pending` para siempre. | MEDIA |
| **Turno cancelado luego del pago** | `CancelAppointmentUseCase` pone `paymentStatus = 'Cancelado'`, restaura cupón si memberPass. Pero no hay comunicación con MP para reembolsar el pago. El payment en BD sigue `approved`. | ALTA |
| **Membresía vencida** | El cron job la marca `expired`. Pero no se notifica al usuario ni se actualiza el dashboard. | MEDIA |
| **Renovación automática (preapproval)** | `handleSubscriptionPayment` renueva correctamente (extiende endDate, resetea cupones). Pero la transacción de renovación no se refleja en analytics. | ALTA |
| **Múltiples pagos para una misma membresía** | `retryPayment` (línea 340) cancela el payment pendiente anterior y crea uno nuevo. Si el webhook del viejo llega después, `findPendingByUser` ya encontrará la membresía aprobada y hará return temprano. | BAJA |
| **Reembolso de turno** | NO implementado. `handleRefunded` solo maneja `product_order`. Un turno reembolsado en MP no actualiza el appointment. | ALTA |
| **Cancelación parcial de orden** | No soportado. Las órdenes se pagan completas o se cancelan completas. No hay items parcialmente pagados. | BAJA |
| **Orden pagada offline (local) y luego cancelada** | Stock decrementado al crear la orden local (línea 79-81 en CreateOrderUseCase). Si se cancela después, el stock NO se restaura. | ALTA |
| **Pago `in_process` o `pending` de MP** | El webhook recibe la notificación pero no actualiza nada (líneas 156-165). El payment queda en estado original (pending). No se refleja en "ingresos pendientes". | MEDIA |
| **Cliente sin email en pago online** | `CreateAppointmentUseCase` usa `dto.clientEmail` para el pago (línea 224). Si no hay email, MP puede fallar dependiendo del método de pago. | BAJA |
| **Membresía creada con billingCycle sin preapproval** | `MembershipController.create()` permite crear membresías con `billingCycle` pero no crea un `preapproval` en MP automáticamente. La membresía no se renovará automáticamente aunque tenga ciclo de facturación. | MEDIA |

---

## Oportunidades de Mejora

### Prioridad CRÍTICA

1. **Incluir ingresos de membresías en todas las métricas de analytics**
   - Modificar `MongoAnalyticsRepository.getOverview()` para incluir `type: 'membership'` en revenue
   - Modificar `getIngresosPorServicio()` para agregar categoría "Membresías"
   - Modificar `ReportsController.exportSalesCsv()` para incluir todos los tipos de pago

2. **Corregir revenue de turnos: incluir Confirmados con pago Pagado**
   - Cambiar `countsAsRevenue` o la lógica de agregación para incluir appointments con `paymentStatus: 'Pagado'` aunque el status no sea `Completado`

3. **Manejar refunds y rejected de turnos en el webhook**
   - Agregar casos `appointment` en `handleRefunded`, `handleRejected`, `handleChargeBack`, `handleInMediation`

### Prioridad ALTA

4. **Agregar métricas de membresías al dashboard**
   - Nuevo endpoint: membresías activas por mes, revenue mensual de membresías
   - Incluir KPI "Membresías activas" en el overview
   - Incluir "Ingresos por membresías" en gráficos de tendencia

5. **Agregar ingreso de membresías a totalSpent de clientes**
   - `$lookup` a `membershiptransactions` en `getClientesList()`

6. **Corregir merge de revenue en reservas-ganancias para incluir períodos solo-ecommerce y membresías**
   - Hacer merge bidireccional en `getReservasGanancias()`
   - Incluir también `type: 'membership'` en el merge

7. **Crear CSV export para membresías**
   - Agregar `exportMembershipsCsv` en `ReportsController`

8. **Notificar expiración de membresía al usuario**
   - Enviar email cuando el cron job expira una membresía

9. **Restaurar stock al cancelar órdenes locales**
   - Agregar `atomicIncreaseStock` en la cancelación de órdenes con `paymentMethod: 'local'`

### Prioridad MEDIA

10. **Separar tasa de cancelación de turnos y órdenes**
    - Mostrar dos tasas independientes en el dashboard

11. **Agregar KPI de "Clientes únicos atendidos" al overview**
    - Contar clientes distintos con turnos/órdenes en el período

12. **Agregar KPI de "Membresías activas" al overview del dashboard**
    - Count de membresías con status 'active' y endDate > now

13. **Agregar métrica de "Tasa de ocupación / slots" en la página de Barberos**
    - Porcentaje de slots disponibles vs ocupados por barbero, visible en la vista CRUD de barberos (NO en dashboard)

14. **Vista consolidada de ingresos (Turnos + Productos + Membresías)**
    - Un gráfico o tabla que muestre las tres fuentes de ingresos juntas

15. **Eliminar KPI card de "Clientes recurrentes" del dashboard**
    - Remover del `CARDS_CONFIG` en `KpiCards.tsx` y eliminar el query `useGetClientesRecurrentesQuery`

### Prioridad BAJA

16. **Manejar renovación automática cuando existe billingCycle pero no preapprovalId**
    - Crear preapproval al asignar billingCycle a una membresía sin preapprovalId

17. **Limpiar pagos huérfanos (pending sin referencia válida)**
    - Cron job para limpiar payments `pending` antiguos sin appointment/order/membership asociado

18. **Agregar tooltip explicativo en cada KPI del dashboard**
    - Explicar qué incluye y qué no incluye cada métrica

---

## Roadmap recomendado

### Fase 1 - Corrección de datos financieros (SEMANA 1-2)
**Objetivo**: Que el dashboard muestre la realidad financiera del negocio.

- [ ] Incluir `type: 'membership'` en revenue de `getOverview()` (`MongoAnalyticsRepository.ts:150-153, 188`)
- [ ] Incluir `type: 'membership'` en pending de `getOverview()` (`MongoAnalyticsRepository.ts:157, 189`)
- [ ] Agregar "Membresías" a `getIngresosPorServicio()` (`MongoAnalyticsRepository.ts:461-474`)
- [ ] Corregir merge de revenue en `getReservasGanancias()` para períodos solo-ecommerce y membresías (`MongoAnalyticsRepository.ts:742-745`)
- [ ] Ampliar `exportSalesCsv` a todos los tipos de pago (`ReportsController.ts:55`)
- [ ] Agregar `countsAsRevenue` para appointments Confirmados con pago Pagado (`appointment.ts:21`)
- [ ] Eliminar KPI card de "Clientes recurrentes" del dashboard (`KpiCards.tsx:220-229`)

### Fase 2 - Completar integraciones (SEMANA 3-4)
**Objetivo**: Que todos los eventos de negocio se propaguen correctamente.

- [ ] Manejar refund/rejected/chargeback para `type: 'appointment'` en webhook (`ProcessWebhookUseCase.ts:405-473`)
- [ ] Notificar email al expirar membresía (cron job en `index.ts:32-45`)
- [ ] Restaurar stock al cancelar órdenes locales (`Order.ts` + controlador de cancelación)
- [ ] Incluir membership spending en `getClientesList().totalSpent` (`MongoAnalyticsRepository.ts:538-577`)
- [ ] Agregar cron job para pagos `pending` huérfanos
- [ ] Agregar KPI "Membresías activas" al overview del dashboard
- [ ] Agregar KPI "Clientes únicos atendidos" al overview del dashboard

### Fase 3 - Métricas completas y visibilidad (SEMANA 5-6)
**Objetivo**: Visibilidad 360° del negocio.

- [ ] Endpoint de revenue de membresías por mes e integración en gráficos de tendencia
- [ ] Vista consolidada de ingresos (Turnos + Productos + Membresías) en dashboard
- [ ] Tasa de ocupación / slots en la página de Barberos (CRUD)
- [ ] Separar tasa de cancelación de turnos vs órdenes
- [ ] Tooltips explicativos en cada KPI del dashboard
- [ ] CSV export para transacciones de membresías

---

## Referencias de archivos clave

| Archivo | Líneas relevantes | Propósito |
|---------|-------------------|-----------|
| `backend-barber/src/infrastructure/repositories/mongodb/MongoAnalyticsRepository.ts` | 113-830 | **Corazón del dashboard** - Todas las agregaciones |
| `backend-barber/src/application/use-cases/payment/ProcessWebhookUseCase.ts` | 1-484 | **Orquestador central** - Procesa webhooks MP → todos los módulos |
| `backend-barber/src/domain/types/appointment.ts` | 20-24 | **STATUS_CATEGORIES** - Define qué estados cuentan como revenue |
| `backend-barber/src/application/use-cases/product/CreateOrderUseCase.ts` | 1-112 | Creación de órdenes con pago |
| `backend-barber/src/application/use-cases/appointment/CreateAppointmentUseCase.ts` | 1-340 | Creación de turnos con pago |
| `backend-barber/src/application/use-cases/appointment/CancelAppointmentUseCase.ts` | 1-146 | Cancelación con restauración de cupón |
| `backend-barber/src/domain/entities/Membership.ts` | 1-168 | Lógica de dominio de membresías |
| `backend-barber/src/interface-adapters/controllers/membership/MembershipController.ts` | 1-504 | API de membresías |
| `backend-barber/src/interface-adapters/controllers/reports/ReportsController.ts` | 1-111 | Export CSV (incompleto) |
| `backend-barber/src/index.ts` | 1-96 | Cron jobs del sistema |
| `frontend-barber/src/pages/admin/DashboardPage/components/KpiCards.tsx` | 1-376 | KPIs del dashboard principal |
| `frontend-barber/src/pages/admin/DashboardPage/components/EcommerceTab.tsx` | 1-182 | Tab de ecommerce en dashboard |
| `frontend-barber/src/services/analyticsApi.ts` | 1-153 | API calls del frontend al backend analytics |
