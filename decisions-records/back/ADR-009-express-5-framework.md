# ADR-009: Express 5 como Framework HTTP

## Contexto

El proyecto necesitaba un framework HTTP para manejar routing, middlewares y el ciclo request/response. En el momento de inicio del proyecto (abril 2026), Express 5 ya estaba disponible como versión estable.

## Decisión

Se eligió Express 5 (`express@^5.2.1`) como framework HTTP. Express 5 maneja errores de promesas rechazadas automáticamente sin necesidad de `express-async-errors` ni wrappers manuales `try/catch` en cada ruta.

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Express 4 | No maneja async errors nativamente, requiere `express-async-errors` |
| Fastify | El equipo no tiene experiencia con Fastify; mayor curva de aprendizaje |
| NestJS | Sobredimensionado para el proyecto; agrega complejidad de decoradores y módulos |
| Hono | Más liviano, pero no hay necesidad de compatibilidad con Edge/Deno |

## Consecuencias

- **Positivo**: Manejo nativo de errores asíncronos sin dependencias extra
- **Positivo**: Familiaridad del equipo con la API de Express
- **Negativo**: Algunos middlewares (como `express-rate-limit`) pueden tener compatibilidad parcial con Express 5
- **Negativo**: Menor ecosistema de plugins comparado con Express 4

## Estado

Aceptada.
