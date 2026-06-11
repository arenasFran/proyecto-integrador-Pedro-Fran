# ADR-020: Máquina de Estados de Appointment y Sistema de Pagos

## Contexto

Los turnos (`Appointment`) tienen un ciclo de vida con transiciones de estado restringidas. Además, se requiere tracking del estado de pago y método de pago (local, online o memberPass).

Originalmente el estado `Pendiente` representaba "esperando confirmación del admin", pero el negocio real no tiene ese paso — el turno se confirma automáticamente al crearse. El `Pendiente` corresponde al **pago**, no al turno.

## Decisión

Se separan dos dimensiones ortogonales:

### AppointmentStatus (asistencia)

```ts
export type AppointmentStatus = 'Confirmado' | 'Completado' | 'Cancelado' | 'NoShow';
```

Transiciones válidas:
```
Confirmado → Completado, Cancelado, NoShow
Completado → (ninguna)
Cancelado  → (ninguna)
NoShow     → (ninguna)
```

### PaymentStatus + PaymentMethod (pago)

```ts
export type PaymentStatus = 'Pendiente' | 'Pagado';
export type PaymentMethod = 'local' | 'online' | 'memberPass';
```

- Al crear un turno → `status: 'Confirmado'`, `paymentStatus: 'Pendiente'`, `paymentMethod: 'local'`
- Al completar un turno con pago local → `status: 'Completado'` + `paymentStatus: 'Pagado'` (automático)
- `NoShow` mantiene el pago como `Pagado` si ya estaba pagado (el comercio retiene el dinero)

## Cambios respecto a versión anterior

- Se eliminó `'Pendiente'` de `AppointmentStatus`
- Se eliminó el método `confirm()` de la entidad (ya no existe esa transición)
- Se agregaron los métodos `cancel()`, `complete()`, `markNoShow()`, `pay()` con validación de transiciones vía `VALID_TRANSITIONS`
- Se agregaron los campos `paymentStatus` y `paymentMethod` a la entidad, DTOs, repositorio, modelo y mapper
- El email de creación ahora informa el estado de pago

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Entidad `Payment` separada con su propio repositorio | Prematuro — un turno tiene un solo pago; se agregaría cuando existan pagos parciales, reembolsos o suscripciones |
| Mantener `Pendiente` como estado del turno | Confundía el dominio: `Pendiente` significaba "esperando admin", pero en el negocio real el turno se agenda directamente |
| Clase Finite State Machine completa | No implementado; la validación de transiciones vive en los métodos de la entidad |

## Consecuencias

- **Positivo**: El dominio ahora refleja el negocio real (el turno arranca Confirmado, lo que varía es el pago)
- **Positivo**: Preparado para pago online y memberPass (solo cambiar `paymentMethod`)
- **Negativo**: Datos existentes con `status: 'Pendiente'` quedan inconsistentes — requieren migración
- ~~**Negativo**: La máquina de estados y los métodos de la entidad no son usados por los casos de uso~~  
  **Resuelto**: Ahora los use cases llaman a los métodos de la entidad (`cancel()`, `complete()`, `markNoShow()`), que validan internamente las transiciones vía `VALID_TRANSITIONS` antes de mutar el estado. La lógica de negocio está centralizada en el dominio.

## Estado

Aceptada — actualizada 2026-06-11.
