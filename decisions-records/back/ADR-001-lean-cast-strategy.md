# ADR-001: Estrategia para tipado de documentos Lean de Mongoose

## Contexto

`MongoBarberRepository` usa `.lean()` en consultas a la colección `barbers`. Mongoose retorna objetos planos (POJOs) que no son instancias de `Document`. Sin embargo, los tipos definidos (`IEmployee`, `IAdmin`) extienden `Document`, lo que genera incompatibilidad de tipos.

La solución original usaba `doc as unknown as IEmployee | IAdmin`, un doble cast que:
- Aniquila el sistema de tipos (pasa por `unknown`)
- No valida que los datos reales cumplan con el contrato
- Oculta errores que solo se manifiestan en runtime horas después

## Decisión

Se adopta una estrategia en dos capas:

### 1. Interfaces planas (`Raw`)

Se crearon `IBarberRaw`, `IEmployeeRaw`, `IAdminRaw` que **no extienden `Document`**, reflejando la estructura real que devuelve `.lean()`. Los campos específicos de discriminadores (`schedule`, `services`, etc.) son opcionales, ya que al consultar vía el modelo base Mongoose no conoce el tipo concreto.

### 2. Type guards con validación runtime

Se implementó `isBarberRaw()` en `guards/barber.guards.ts` que verifica en runtime los campos obligatorios que el mapper necesita (`_id`, `email`, `password`, `name`, `lastname`, `phone`, `kind`). Si el documento no cumple, lanza un error inmediato en el repositorio.

## Consecuencias

- **Positivo**: Los datos corruptos o malformados de MongoDB no llegan al dominio. El error se detecta en el repositorio, no 500 requests después.
- **Positivo**: El type guard estrecha el tipo automáticamente, eliminando la necesidad de `as`.
- **Positivo**: TypeScript ahora refleja fielmente el tipo de dato que realmente circula.
- **Negativo**: Mantenimiento manual — si `IEmployeeRaw` se modifica, el guard debe actualizarse. Zod eliminaría esta fricción al inferir el tipo del schema.

## Alternativas descartadas

| Alternativa | Motivo de rechazo |
|---|---|
| `as unknown as` | Elimina toda seguridad de tipos |
| Zod | Se descartó por evitar dependencias externas, aunque es el estándar industrial |

## Estado

Aceptada.
