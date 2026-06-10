# ADR-020: Máquina de Estados de Appointment (Transiciones de Estado)

## Contexto

Los turnos (`Appointment`) tienen un ciclo de vida. No todas las transiciones son válidas (ej: un turno completado no puede reconfirmarse). El sistema necesitaba reglas de negocio para rechazar transiciones inválidas.

## Decisión

Se define una máquina de estados en `domain/types/appointment.ts`:

```ts
export type AppointmentStatus = 'Pendiente' | 'Confirmado' | 'Cancelado' | 'Completado';

export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Pendiente: ['Confirmado', 'Cancelado'],
  Confirmado: ['Completado', 'Cancelado'],
  Cancelado: [],
  Completado: [],
};
```

Adicionalmente, la entidad `Appointment` tiene métodos que encapsulan los efectos secundarios de cada transición:
- `cancel(reason?)` — setea `status = 'Cancelado'`, `cancelReason`, `cancelledAt`, `updatedAt`
- `confirm()` — setea `status = 'Confirmado'`, `updatedAt`
- `complete()` — setea `status = 'Completado'`, `updatedAt`

`UpdateAppointmentStatusUseCase` valida la transición contra `VALID_TRANSITIONS` antes de persistir.

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Clase Finite State Machine completa con validación centralizada | No implementado; actualmente la validación está en el use case y los métodos en la entidad |
| Campo status libre sin validación | Permitiría estados inválidos (ej: Pendiente → Completado directo) |
| CHECK constraint en base de datos | MongoDB no tiene CHECK constraints nativas |

## Consecuencias

- **Positivo**: Las transiciones inválidas se rechazan en la capa de aplicación, no solo en UI
- **Positivo**: Los métodos de `Appointment` encapsulan efectos secundarios (setear `cancelReason`, `cancelledAt`)
- **Negativo**: La máquina de estados está en `types/appointment.ts` pero los métodos de transición están en `entities/Appointment.ts`; lógica duplicada que podría divergir
- **Negativo**: `UpdateAppointmentStatusUseCase` no usa los métodos de la entidad (`cancel()`, `confirm()`, `complete()`); actualiza el status directamente vía repositorio

## Estado

Aceptada.
