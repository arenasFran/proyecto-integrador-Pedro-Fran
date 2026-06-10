# ADR-018: Value Objects de Dominio (Email, Phone, Price, DurationMinutes)

## Contexto

Los campos primitivos (string para email, number para precio) se usaban en todo el dominio con validación dispersa entre casos de uso y controladores. No había garantía de que un valor inválido no llegara a la capa de dominio. Se necesitaba aplicar el principio "make illegal states unrepresentable".

## Decisión

Se implementan cuatro Value Objects con un patrón consistente:

| VO | Validación | Normalización |
|---|---|---|
| `Email` | Regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` | `trim().toLowerCase()` |
| `Phone` | `^\+?\d{7,15}$` | Elimina espacios/guiones/parens; normaliza `0...` → `+598...` (Uruguay) |
| `Price` | `Number.isFinite(raw) && raw > 0` | — |
| `DurationMinutes` | `Number.isFinite(raw) && raw > 0` | — |

Cada VO tiene:
- Constructor privado
- `static create(raw)` — factory que lanza `Error` si el input es inválido
- `getValue()` — accessor del valor interno
- Inmutabilidad (propiedades privadas readonly)

Los VOs se usan dentro de las entidades `Barber`, `Appointment` y `Service`:
```ts
// Barber.create()
static create(props: BarberProps): Barber {
  return new Barber({
    ...props,
    email: Email.create(props.email),
    phone: Phone.create(props.phone),
    slotDuration: DurationMinutes.create(props.slotDuration),
  });
}
```

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Branded types (`type Email = string & { __brand: 'Email' }`) | No tienen validación en runtime |
| Validación inline en constructores de entidades | Violación de DRY; la misma validación se repetiría en cada entidad |
| Solo validación con Joi en el borde HTTP | El dominio recibiría tipos primitivos sin garantía de validez |

## Consecuencias

- **Positivo**: Cada Email, Phone, Price y DurationMinutes está garantizado válido desde su creación
- **Positivo**: `Phone.normalize()` asegura formato consistente en storage (prefijo Uruguay)
- **Positivo**: Las entidades de dominio delegan la validación a los VOs, manteniéndose limpias
- **Negativo**: Las entidades deben llamar a los factories VO, que pueden lanzar; los errores deben capturarse upstream
- **Negativo**: `toPrimitives()` debe unwrappear los VOs, agregando boilerplate
- **Negativo**: No hay un VO para `Password` como tal (la validación de fortaleza está en `Password` pero como helper, no como VO de dominio puro)

## Estado

Aceptada.
