# ADR-016: Manejo de Errores via AppError + Presenter Estático

## Contexto

Antes de este cambio, el manejo de errores era inconsistente entre controladores: algunos retornaban `{ error: "..." }` directamente, otros usaban `next(err)`, y los códigos de estado estaban hardcodeados. El global error handler existía pero solo atrapaba errores no manejados (500).

## Decisión

Se adopta una estrategia en dos partes:

### 1. `AppError` (`application/errors/AppError.ts`)
Clase personalizada que extiende `Error` con un campo `statusCode`:
```ts
export class AppError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = 'AppError';
  }
}
```
Los casos de uso lanzan `new AppError('mensaje', statusCode)` para errores esperados.

### 2. Presenters estáticos
Cada módulo tiene su presenter (`AuthPresenter`, `BarberPresenter`, `AppointmentPresenter`, `ServicePresenter`) con dos métodos estáticos:
- `success(res, payload, status?)` — envía respuesta JSON con el payload
- `handleError(res, error, fallbackMessage)` — si es `AppError`, respeta `statusCode` y mensaje; si no, responde 500 con mensaje de fallback

### Patrón en todos los controladores:
```ts
try {
  const result = await someUseCase.execute(dto);
  return SomePresenter.success(res, result, 200);
} catch (error) {
  return SomePresenter.handleError(res, error, 'Mensaje por defecto');
}
```

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Express error-handling middleware (`next(err)`) | Inconsistente con el patrón Presenter; mezcla responsabilidades |
| `Result<T, E>` monads (estilo Rust/FP) | TypeScript tiene ergonomía pobre para union types discriminados con errores |
| Un solo `AppError` sin presenters | Cada módulo necesita sus propios mensajes de fallback |

## Consecuencias

- **Positivo**: Formato de error consistente en todos los endpoints: `{ error: string }`
- **Positivo**: Los casos de uso no conocen HTTP; solo lanzan `AppError`
- **Negativo**: Cuatro archivos presenter casi idénticos (boilerplate duplicado)
- **Negativo**: `handleError` oculta excepciones no-`AppError` con un mensaje 500 genérico; el debugging requiere logs del servidor
- **Negativo**: El global error handler en `app.ts` solo atrapa errores que escapan del patrón Presenter

## Estado

Aceptada.
