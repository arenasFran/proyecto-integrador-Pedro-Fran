# ADR-021: TempLock para Reserva Temporal de Slots

## Contexto

Cuando un usuario reserva un turno (flujo multi-paso: seleccionar barbero → servicio → fecha/hora → confirmar), el slot seleccionado podría ser tomado por otro usuario entre la selección y la confirmación. Se necesitaba un mecanismo de lock temporal.

## Decisión

Se implementa una colección `TempLock` en MongoDB con:

- **Campos:** `barberId`, `date`, `startTime`, `clientId?`, `createdAt`
- **TTL index:** `{ createdAt: 1 }` con `expireAfterSeconds: 300` (5 minutos) — limpieza automática
- **Unique index:** `{ barberId: 1, date: 1, startTime: 1 }` — previene doble reserva del mismo slot

### Flujo
1. Frontend llama a `POST /api/appointments/temp-lock` antes de mostrar la pantalla de confirmación
2. `CreateTempLockUseCase` intenta insertar el documento
3. Si MongoDB lanza error de clave duplicada (code 11000), se traduce a `"El horario ya fue apartado por otro usuario."` con status 409
4. Si el usuario confirma, `CreateAppointmentUseCase` elimina el TempLock correspondiente (fire-and-forget, `.catch(() => {})`)
5. Si el usuario no confirma, el TTL index elimina el lock automáticamente a los 5 minutos

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Pessimistic locking (mutex por slot en la app) | No escala horizontalmente con múltiples réplicas |
| Redis-based locks con TTL | Requiere infraestructura adicional (Redis); se evita para mantener simplicidad |
| Sin lock (optimista, verificar disponibilidad al confirmar) | Mala UX: el usuario ve "slot ocupado" después de completar el formulario |

## Consecuencias

- **Positivo**: Limpieza automática via TTL index; no quedan locks huérfanos
- **Positivo**: Unique index previene race conditions a nivel de base de datos
- **Positivo**: Sin infraestructura extra (Redis, ZooKeeper)
- **Negativo**: El lock es por `barberId + date + startTime`; si los slots tienen duración variable, el locking necesitaría ser más sofisticado
- **Negativo**: TTL de 5 minutos está hardcodeado en el schema; no configurable
- **Negativo**: La eliminación del lock al confirmar es fire-and-forget; si falla, queda un lock stale (se limpiará en 5 min por TTL)

## Estado

Aceptada.
