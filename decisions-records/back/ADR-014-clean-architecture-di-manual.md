# ADR-014: Arquitectura Hexagonal + Clean Architecture con DI Manual

## Contexto

El código original tenía una arquitectura monolítica donde modelos, servicios y controladores estaban mezclados. Se llegó a un punto muerto (commit `b23fcff`: "Se detiene desarrollo por refactor de clean arch") que forzó una reestructuración completa. El equipo decidió adoptar Clean Architecture para separar la lógica de negocio de los detalles de infraestructura.

## Decisión

El backend se organiza en cinco capas, con inyección de dependencias manual a través de archivos de wiring:

```
┌─────────────────────────────────────────────┐
│           INTERFACE ADAPTERS                │
│  (controllers, presenters, middlewares,     │
│   validators, routes)                       │
│  Depende de: application, domain            │
├──────────────────────┬──────────────────────┤
│    APPLICATION       │   INFRASTRUCTURE     │
│  (use-cases, ports,  │  (repositories,      │
│   DTOs, AppError)    │   services, mappers, │
│                      │   models, config)    │
│  Depende de: domain  │  Depende de: app     │
│                      │  ports + domain      │
├──────────────────────┴──────────────────────┤
│               DOMAIN                        │
│  (entities, value-objects, repository       │
│   interfaces, types)                        │
│  NO importa nada externo                    │
├─────────────────────────────────────────────┤
│               WIRING                        │
│  (composición de dependencias — DI manual)  │
│  ES EL ÚNICO lugar que importa TODAS capas  │
└─────────────────────────────────────────────┘
```

### Reglas de dependencia
- Las dependencias apuntan **siempre hacia adentro** (domain → nadie)
- `domain/` no importa Express, Mongoose, Joi, JWT, bcrypt ni Nodemailer
- `application/` solo importa `domain/` y puertos (interfaces)
- `infrastructure/` implementa los puertos definidos en `application/`
- `interface-adapters/` orquesta casos de uso
- `wiring/` compone todo (único lugar con acceso a todas las capas)

### Archivos de wiring
- `auth.ts`, `barber.ts`, `appointment.ts`, `service.ts`, `tempLock.ts`

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| NestJS (DI con decoradores) | Lock-in de framework; sobreingeniería para el tamaño del proyecto |
| tsyringe / inversify (reflection-based DI) | El wiring manual mantiene el grafo de dependencias explícito y visible |
| MVC simple (controllers/services/models) | Fue el approach inicial y llevó al punto muerto que motivó el refactor |

## Consecuencias

- **Positivo**: Separación clara de responsabilidades; la lógica de negocio es testeable sin infraestructura
- **Positivo**: Fácil intercambiar implementaciones (ej: `FakeEmailService` en tests, `NodemailerEmailService` en producción)
- **Positivo**: El wiring centraliza toda la composición; es fácil ver el grafo de dependencias
- **Negativo**: Alto boilerplate: cada caso de uso requiere un DTO, actualización de puertos, entrada en wiring, método en controlador y binding en ruta
- **Negativo**: El wiring debe mantenerse a mano; agregar una dependencia implica editar un archivo de wiring

## Estado

Aceptada.
