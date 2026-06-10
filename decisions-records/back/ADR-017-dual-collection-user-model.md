# ADR-017: Modelo de Usuario en Dos Colecciones con Repositorio Cruzado

## Contexto

Como consecuencia de ADR-011 (discriminators), los usuarios autenticables se almacenan en dos colecciones separadas: `barbers` (Admin + Empleado) y `clients` (Registrado). El flujo de login (`SendTwoFactorCodeUseCase`, `ResetPasswordUseCase`, etc.) necesita encontrar un usuario por email independientemente de en qué colección resida.

## Decisión

`MongoUserRepository` implementa `IUserRepository` consultando ambas colecciones secuencialmente:

```ts
async findByEmail(email: string): Promise<User | null> {
  const barber = await Barber.findOne({ email });           // "barbers"
  if (barber) return UserMapper.fromBarber(barber);
  const client = await RegisteredClient.findOne({ email }); // "clients"
  if (client) return UserMapper.fromRegisteredClient(client);
  return null;
}
```

`UserMapper` tiene dos métodos: `fromBarber()` y `fromRegisteredClient()`, cada uno mapeando al `User` de dominio compartido. Los métodos de actualización (`updatePassword`, `updateTwoFactor`, `updateUserSecurity`, `updateLastLogin`) siguen el mismo patrón: intentar en `Barber` primero, fallback a `RegisteredClient`.

## Alternativas consideradas

| Alternativa | Motivo de rechazo |
|---|---|
| Colección única `users` con discriminator incluyendo staff y clientes | Mezcla campos muy diferentes en una sola colección; índices y relaciones complejos |
| Repositorio unificado con herencia de modelos en una colección | Mongoose no soporta herencia polimórfica compleja en un solo modelo base |
| Búsqueda paralela con `Promise.all` | Dos queries simultáneas en lugar de secuenciales; ganancia marginal y más complejidad |

## Consecuencias

- **Positivo**: Separación limpia: la gestión de staff y clientes es independiente
- **Positivo**: Cada colección tiene índices adaptados a sus patrones de acceso
- **Negativo**: `findByEmail` siempre consulta dos colecciones, duplicando latencia por cada login/reset
- **Negativo**: Los métodos `update*` prueban `Barber` primero y retornan early; si el usuario es `RegisteredClient`, la segunda consulta es inevitable
- **Negativo**: Si se agrega un tercer tipo de usuario autenticable (ej: `SuperAdmin` en otra colección), hay que modificar `MongoUserRepository`

## Estado

Aceptada.
