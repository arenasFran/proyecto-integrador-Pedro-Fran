# ADR-015: Joi para Validación de Entrada

## Contexto

La API recibe input del usuario (registro, login, creación de turnos, etc.) y necesita validación antes de llegar a los casos de uso. Se necesitaba un middleware de validación genérico y reutilizable.

## Decisión

Se usa Joi (`joi@^18.1.2`) para validación basada en schemas. El middleware genérico `validate` en `validation.middleware.ts` acepta `{ body?, params?, query? }`, aplica los schemas con `abortEarly: false` y `stripUnknown: true`, y retorna 400 con mensajes de error concatenados en caso de fallo.

Archivos de validación:
- `auth.validator.ts` — registerSchema, loginSchema (hoy no usado), 2FA schemas
- `barber.validator.ts` — schemas de creación/actualización de barberos
- `appointment.validator.ts` — schemas de creación/consulta de turnos
- `recovery.validator.ts` — schemas de request/reset de contraseña

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Zod (type-safe, infiere tipos TS del schema) | Descartado en ADR-001 por evitar dependencias externas (aunque ADR-001 reconoce Zod como "estándar industrial") |
| class-validator + class-transformer | Requiere decoradores experimentales de TypeScript |
| Validación manual en controladores | Repetitivo y propenso a errores; viola el principio DRY |

## Consecuencias

- **Positivo**: Schemas declarativos con mensajes de error enriquecidos
- **Positivo**: Separación de la lógica de validación de los controladores
- **Positivo**: `abortEarly: false` muestra todos los errores de una vez, no solo el primero
- **Negativo**: Joi no infiere tipos TypeScript nativamente; requiere tipos manuales o `@joi/tools`
- **Negativo**: Dependencia externa que no se usa en ninguna otra parte del código

## Estado

Aceptada.
