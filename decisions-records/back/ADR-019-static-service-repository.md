# ADR-019: ServiceRepository Estático para Catálogo de Servicios

## Contexto

El catálogo de servicios (corte, barba, etc.) es pequeño (4 items) y cambia con poca frecuencia. Almacenarlos en MongoDB requeriría una colección, endpoints CRUD y una UI de administración. El equipo consideró que era sobreingeniería.

## Decisión

Los servicios se almacenan en un array estático de TypeScript en `infrastructure/config/services.ts`. `StaticServiceRepository` implementa `IServiceRepository` (con `findAll()` y `findById()`) mapeando este array mediante `ServiceMapper.fromStaticData()`.

No existe colección MongoDB para servicios. El wiring inyecta `StaticServiceRepository` donde se necesita.

```ts
// services.ts
export const SERVICES = [
  { id: '1', name: 'Corte Clásico', description: '...', price: 600, imageUrl: '...' },
  { id: '2', name: 'Corte Degradado', description: '...', price: 800, imageUrl: '...' },
  // ... 2 más
];
```

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Colección MongoDB con CRUD y admin UI | Sobreingeniería para 4 items que cambian rara vez |
| Variable de entorno con JSON | Propenso a errores de formato para datos estructurados |
| Migraciones/seed de MongoDB | Complejidad adicional en el deploy; el seed de admin ya existe |

## Consecuencias

- **Positivo**: Cero queries a DB para el recurso más leído (landing page, booking)
- **Positivo**: Simple de actualizar: editar `services.ts`, rebuild, redeploy
- **Negativo**: No se puede modificar en runtime (no hay UI de admin para agregar servicios)
- **Negativo**: Si se necesitan servicios diferentes por instancia, habría que usar env vars o config de deploy
- **Negativo**: Inconsistencia con el resto del sistema, que usa MongoDB para todas las demás entidades

## Estado

Aceptada.
